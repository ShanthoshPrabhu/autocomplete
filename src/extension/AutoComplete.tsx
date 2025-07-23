import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
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
      debounceMs: 300,
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
              console.log("🔄 Plugin state updated via meta:", meta);
              return meta;
            }

            if (!tr.docChanged && !tr.selectionSet) {
              return oldState;
            }

            const { doc, selection } = newState;
            const { from } = selection;
            const currentWord = getCurrentWord(doc, from);

            if (
              currentWord.length < 2 ||
              Math.abs(from - oldState.lastPosition) > currentWord.length + 5
            ) {
              console.log(
                "❌ Clearing suggestions - word too short or position changed significantly"
              );
              return {
                suggestion: null,
                decorations: DecorationSet.empty,
                lastQuery: "",
                lastPosition: from,
              };
            }

            if (currentWord !== oldState.lastQuery) {
              console.log("🔄 Query changed, clearing suggestions");
              return {
                suggestion: null,
                decorations: DecorationSet.empty,
                lastQuery: currentWord,
                lastPosition: from,
              };
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

          const updateSuggestions = async (query: string, position: number) => {
            if (isProcessing) {
              console.log("⏸️ Already processing, skipping");
              return;
            }

            isProcessing = true;
            console.log(
              "🚀 Starting API call for:",
              `'${query}'`,
              "at position:",
              position
            );

            if (currentAbortController) {
              currentAbortController.abort();
            }

            currentAbortController = new AbortController();
            const signal = currentAbortController.signal;

            try {
              const response = await fetch(
                `${options.apiBaseUrl}/autocomplete?query=${encodeURIComponent(
                  query
                )}&limit=10`,
                {
                  signal,
                  headers: {
                    "ngrok-skip-browser-warning": "true",
                    "Content-Type": "application/json",
                  },
                }
              );

              if (signal.aborted) {
                console.log("🛑 Request aborted");
                return;
              }

              if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
              }

              const data = await response.json();
              console.log("📡 API response:", data);

              const matches = data.suggestions || [];
              console.log("🔍 Matches found:", matches);

              if (matches.length > 0) {
                const bestMatch = matches[0];

                console.log("🎯 Best match:", bestMatch);

                if (bestMatch) {
                  const completion = bestMatch.slice(query.length);
                  console.log("✂️ Completion text:", `'${completion}'`);

                  if (completion && completion.length > 0) {
                    const currentState = editorView.state;
                    const currentFrom = currentState.selection.from;
                    const currentWordNow = getCurrentWord(
                      currentState.doc,
                      currentFrom
                    );

                    if (currentWordNow === query) {
                      console.log(
                        "📍 Creating decoration at position:",
                        currentFrom
                      );

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

                      console.log("✅ Setting suggestion state:", newState);

                      const tr = editorView.state.tr.setMeta(
                        autocompleteKey,
                        newState
                      );
                      editorView.dispatch(tr);

                      console.log("🎉 Suggestion dispatched!");
                    } else {
                      console.log(
                        "⚠️ Query changed during API call, ignoring result"
                      );
                    }
                  }
                }
              }

              if (!matches.length) {
                console.log("❌ No valid suggestions found");
              }
            } catch (error) {
              if (error instanceof Error && error.name === "AbortError") {
                console.log("🛑 Request was aborted");
                return;
              }

              console.error("💥 Autocomplete API error:", error);
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

              console.log(
                "📋 Update triggered - word:",
                `'${currentWord}'`,
                "position:",
                from
              );

              if (currentWord.length < 2) {
                console.log("❌ Word too short, skipping");
                return;
              }

              if (
                pluginState.lastQuery === currentWord &&
                pluginState.suggestion
              ) {
                console.log("✅ Already have suggestion for this query");
                return;
              }

              console.log("⏱️ Setting up debounced API call");

              debounceTimer = setTimeout(() => {
                updateSuggestions(currentWord, from);
              }, options.debounceMs);
            },
            destroy: () => {
              console.log("🧹 Cleaning up autocomplete plugin");
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
  console.log(
    "👻 Creating ghost text widget with completion:",
    `'${completion}'`
  );
  const span = document.createElement("span");
  span.textContent = completion;
  span.style.color = "#6b7280";
  span.style.fontStyle = "italic";
  span.style.opacity = "0.7";
  span.style.pointerEvents = "none";
  span.contentEditable = "false";
  span.setAttribute("data-autocomplete", "true");
  return span;
}
