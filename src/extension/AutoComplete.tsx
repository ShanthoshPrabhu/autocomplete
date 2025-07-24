import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { auth } from "../../lib/firebase";
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

export interface AutocompleteOptions {
  debounceMs: number;
  apiBaseUrl: string;
}

interface AutocompleteState {
  suggestion: string | null;
  decorations: DecorationSet;
  lastQuery: string;
  lastPosition: number;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    autocomplete: {
      acceptSuggestion: () => ReturnType;
    };
  }
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let currentAbortController: AbortController | null = null;

export const AutocompleteExtension = Extension.create<AutocompleteOptions>({
  name: "autocomplete",

  addOptions() {
    return {
      debounceMs: 200,
      apiBaseUrl,
    };
  },

  addCommands() {
    return {
      acceptSuggestion:
        () =>
        ({ state, dispatch }) => {
          const { doc, selection } = state;
          const { from } = selection;

          const plugin = autocompleteKey.getState(state) as AutocompleteState;

          if (!plugin || !plugin.suggestion) return false;

          const transaction = state.tr;
          const currentWord = getCurrentWord(doc, from);
          const wordStart = from - currentWord.length;
          const suggestion = plugin.suggestion as string;

          transaction.insertText(suggestion, wordStart, from);
          transaction.setMeta(autocompleteKey, {
            suggestion: null,
            decorations: DecorationSet.empty,
            lastQuery: "",
            lastPosition: -1,
          });

          if (dispatch) {
            dispatch(transaction);
          }

          return true;
        },
    };
  },

  addKeyboardShortcuts() {
    return {
      Tab: ({ editor }) => {
        return editor.commands.acceptSuggestion();
      },
    };
  },

  addProseMirrorPlugins() {
    const options = this.options;

    return [
      new Plugin({
        key: autocompleteKey,
        state: {
          init() {
            return {
              suggestion: null,
              decorations: DecorationSet.empty,
              lastQuery: "",
              lastPosition: -1,
            };
          },
          apply(tr, oldState, newState) {
            const meta = tr.getMeta(autocompleteKey);
            if (meta) {
              return meta;
            }

            if (tr.docChanged) {
              const { doc, selection } = newState;
              const { from } = selection;
              const currentWord = getCurrentWord(doc, from);

              if (currentWord.length < 2) {
                return {
                  suggestion: null,
                  decorations: DecorationSet.empty,
                  lastQuery: "",
                  lastPosition: from,
                };
              }

              if (
                Math.abs(from - oldState.lastPosition) >
                currentWord.length + 5
              ) {
                return {
                  suggestion: null,
                  decorations: DecorationSet.empty,
                  lastQuery: "",
                  lastPosition: from,
                };
              }

              return {
                suggestion: null,
                decorations: DecorationSet.empty,
                lastQuery: currentWord,
                lastPosition: from,
              };
            }

            if (!tr.selectionSet) {
              return oldState;
            }

            return oldState;
          },
        },
        props: {
          decorations(state) {
            const plugin = autocompleteKey.getState(state);
            return plugin?.decorations || DecorationSet.empty;
          },
        },
        view(editorView) {
          let isProcessing = false;

          const updateSuggestions = async (query: string) => {
            if (isProcessing) {
              return;
            }

            isProcessing = true;

            if (currentAbortController) {
              currentAbortController.abort();
            }

            currentAbortController = new AbortController();
            const signal = currentAbortController.signal;

            try {
              const user = auth.currentUser;
              if (!user) {
                throw new Error("User not authenticated");
              }

              const token = await user.getIdToken();

              const response = await fetch(
                `${options.apiBaseUrl}/autocomplete?query=${encodeURIComponent(
                  query
                )}&limit=10`,
                {
                  signal,
                  headers: {
                    "ngrok-skip-browser-warning": "true",
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                  },
                }
              );

              if (signal.aborted) {
                return;
              }

              if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
              }

              const data = await response.json();

              const matches = data.suggestions || [];

              if (matches.length > 0) {
                const bestMatch = matches[0];

                if (
                  bestMatch &&
                  bestMatch.toLowerCase().startsWith(query.toLowerCase())
                ) {
                  const completion = bestMatch.slice(query.length);

                  if (completion && completion.length > 0) {
                    const currentState = editorView.state;
                    const currentFrom = currentState.selection.from;
                    const currentWordNow = getCurrentWord(
                      currentState.doc,
                      currentFrom
                    );

                    if (currentWordNow.toLowerCase() === query.toLowerCase()) {
                      const decoration = Decoration.widget(
                        currentFrom,
                        createGhostTextWidget(completion),
                        {
                          side: 1,
                          key: "autocomplete-ghost",
                        }
                      );

                      const newState = {
                        suggestion: bestMatch,
                        decorations: DecorationSet.create(currentState.doc, [
                          decoration,
                        ]),
                        lastQuery: query,
                        lastPosition: currentFrom,
                      };

                      const tr = editorView.state.tr.setMeta(
                        autocompleteKey,
                        newState
                      );
                      editorView.dispatch(tr);
                    }
                  }
                }
              }
            } catch (error) {
              if (error instanceof Error && error.name === "AbortError") {
                return;
              }
              console.error("Autocomplete error:", error);
            } finally {
              isProcessing = false;
              currentAbortController = null;
            }
          };

          return {
            update: (view) => {
              const { state } = view;
              const { doc, selection } = state;
              const { from } = selection;

              if (debounceTimer) {
                clearTimeout(debounceTimer);
                debounceTimer = null;
              }

              const currentWord = getCurrentWord(doc, from);
              const pluginState = autocompleteKey.getState(
                state
              ) as AutocompleteState;

              if (currentWord.length < 2) {
                if (pluginState.suggestion) {
                  const tr = view.state.tr.setMeta(autocompleteKey, {
                    suggestion: null,
                    decorations: DecorationSet.empty,
                    lastQuery: "",
                    lastPosition: from,
                  });
                  view.dispatch(tr);
                }
                return;
              }

              if (
                pluginState.lastQuery === currentWord &&
                pluginState.suggestion
              ) {
                return;
              }

              debounceTimer = setTimeout(() => {
                const latestState = view.state;
                const latestFrom = latestState.selection.from;
                const latestWord = getCurrentWord(latestState.doc, latestFrom);

                if (latestWord === currentWord && latestWord.length >= 2) {
                  updateSuggestions(currentWord);
                }
              }, options.debounceMs);
            },
            destroy: () => {
              if (debounceTimer) {
                clearTimeout(debounceTimer);
                debounceTimer = null;
              }
              if (currentAbortController) {
                currentAbortController.abort();
                currentAbortController = null;
              }
            },
          };
        },
      }),
    ];
  },
});

const autocompleteKey = new PluginKey("autocomplete");

function getCurrentWord(doc: any, pos: number): string {
  let start = pos;
  let end = pos;
  const text = doc.textContent;

  while (start > 0 && /\w/.test(text[start - 1])) {
    start--;
  }

  while (end < text.length && /\w/.test(text[end])) {
    end++;
  }

  return text.slice(start, pos);
}

function createGhostTextWidget(completion: string): HTMLElement {
  const span = document.createElement("span");
  span.textContent = completion;
  span.style.color = "#6b7280";
  span.style.opacity = "0.7";
  span.style.pointerEvents = "none";
  span.contentEditable = "false";
  span.setAttribute("data-autocomplete", "true");
  return span;
}
