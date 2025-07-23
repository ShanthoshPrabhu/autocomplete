import React from "react";
import { useEditor, EditorContent, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { AutocompleteExtension } from "../extension/AutoComplete";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Undo,
  Redo,
  LogOut,
} from "lucide-react";
import { signOut } from "firebase/auth";
import { auth } from "../../lib/firebase";

const TextEditor: React.FC = () => {
  const editor = useEditor({
    extensions: [StarterKit, AutocompleteExtension],
    content: ``,
    editorProps: {
      attributes: {
        class:
          "prose prose-invert prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[400px] p-4 text-white bg-black prose-headings:text-white prose-p:text-gray-300 prose-strong:text-white prose-em:text-gray-300 prose-ul:text-gray-300 prose-ol:text-gray-300 prose-li:text-gray-300",
      },
    },
    immediatelyRender: true,
    shouldRerenderOnTransaction: false,
  });

  const editorState = useEditorState({
    editor,
    selector: ({ editor: editorInstance }) => {
      if (!editorInstance) {
        return {
          isBold: false,
          isItalic: false,
          isBulletList: false,
          isOrderedList: false,
          canUndo: false,
          canRedo: false,
        };
      }

      return {
        isBold: editorInstance.isActive("bold"),
        isItalic: editorInstance.isActive("italic"),
        isBulletList: editorInstance.isActive("bulletList"),
        isOrderedList: editorInstance.isActive("orderedList"),
        canUndo: editorInstance.can().undo(),
        canRedo: editorInstance.can().redo(),
      };
    },
  });

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  if (!editor) {
    return null;
  }

  return (
    <div className="min-h-screen bg-black flex justify-center items-center">
      <div className="w-full max-w-4xl shadow-2xl border border-gray-800 rounded-lg">
        <div className="border-b border-gray-700 p-4 flex justify-between items-center">
          <h1 className="text-xl font-semibold text-white">Text Editor</h1>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:text-red-400 hover:bg-zinc-900 rounded cursor-pointer"
            title="Logout"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>

        <div className="border-b border-gray-700 p-4">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => editor?.chain().focus().toggleBold().run()}
              className={`p-2 rounded cursor-pointer text-gray-300 ${
                editorState.isBold
                  ? "bg-zinc-800 text-white"
                  : "hover:bg-zinc-800"
              }`}
              title="Bold"
            >
              <Bold size={18} />
            </button>

            <button
              onClick={() => editor?.chain().focus().toggleItalic().run()}
              className={`p-2 rounded cursor-pointer text-gray-300 ${
                editorState.isItalic
                  ? "bg-zinc-800 text-white"
                  : "hover:bg-zinc-800"
              }`}
              title="Italic"
            >
              <Italic size={18} />
            </button>

            <div className="w-px h-8 bg-gray-600 mx-2" />

            <button
              onClick={() => editor?.chain().focus().toggleBulletList().run()}
              className={`p-2 rounded cursor-pointer text-gray-300 ${
                editorState.isBulletList
                  ? "bg-zinc-800 text-white"
                  : "hover:bg-zinc-800"
              }`}
              title="Bullet List"
            >
              <List size={18} />
            </button>

            <button
              onClick={() => editor?.chain().focus().toggleOrderedList().run()}
              className={`p-2 rounded cursor-pointer text-gray-300 ${
                editorState.isOrderedList
                  ? "bg-zinc-800 text-white"
                  : "hover:bg-zinc-800"
              }`}
              title="Ordered List"
            >
              <ListOrdered size={18} />
            </button>

            <div className="w-px h-8 bg-gray-600 mx-2" />

            <button
              onClick={() => editor?.chain().focus().undo().run()}
              disabled={!editorState.canUndo}
              className="p-2 rounded cursor-pointer text-gray-300 hover:bg-zinc-800 disabled:opacity-50 disabled:text-gray-600"
              title="Undo"
            >
              <Undo size={18} />
            </button>

            <button
              onClick={() => editor?.chain().focus().redo().run()}
              disabled={!editorState.canRedo}
              className="p-2 rounded cursor-pointer text-gray-300 hover:bg-zinc-800 disabled:opacity-50 disabled:text-gray-600"
              title="Redo"
            >
              <Redo size={18} />
            </button>
          </div>
        </div>

        <div className="min-h-[500px] bg-black">
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
};

export default TextEditor;
