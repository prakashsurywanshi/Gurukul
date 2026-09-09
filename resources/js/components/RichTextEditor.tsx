import { useRef } from 'react';
import { CKEditor } from '@ckeditor/ckeditor5-react';
import {
    ClassicEditor,
    Essentials,
    Paragraph,
    Heading,
    Bold,
    Italic,
    Link,
    List,
    BlockQuote,
    Table,
    TableToolbar,
    Indent,
    IndentBlock,
    SourceEditing,
    CodeBlock,
    HtmlEmbed,
} from 'ckeditor5';
import 'ckeditor5/ckeditor5.css';

interface RichTextEditorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
}

export default function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
    const editorRef = useRef<any>(null);

    return (
        <div className="rich-text-editor">
            <CKEditor
                editor={ClassicEditor}
                config={{
                    licenseKey: 'GPL',
                    plugins: [
                        Essentials,
                        Paragraph,
                        Heading,
                        Bold,
                        Italic,
                        Link,
                        List,
                        BlockQuote,
                        Table,
                        TableToolbar,
                        Indent,
                        IndentBlock,
                        SourceEditing,
                        CodeBlock,
                        HtmlEmbed,
                    ],
                    toolbar: {
                        items: [
                            'heading',
                            '|',
                            'bold',
                            'italic',
                            'link',
                            'bulletedList',
                            'numberedList',
                            '|',
                            'outdent',
                            'indent',
                            '|',
                            'blockQuote',
                            'insertTable',
                            '|',
                            'undo',
                            'redo',
                            '|',
                            'sourceEditing',
                            'codeBlock',
                            'htmlEmbed',
                        ],
                        shouldNotGroupWhenFull: true,
                    },
                    heading: {
                        options: [
                            {
                                model: 'paragraph',
                                title: 'Paragraph',
                                class: 'ck-heading_paragraph',
                            },
                            {
                                model: 'heading1',
                                view: 'h1',
                                title: 'Heading 1',
                                class: 'ck-heading_heading1',
                            },
                            {
                                model: 'heading2',
                                view: 'h2',
                                title: 'Heading 2',
                                class: 'ck-heading_heading2',
                            },
                            {
                                model: 'heading3',
                                view: 'h3',
                                title: 'Heading 3',
                                class: 'ck-heading_heading3',
                            },
                            {
                                model: 'heading4',
                                view: 'h4',
                                title: 'Heading 4',
                                class: 'ck-heading_heading4',
                            },
                        ],
                    },
                    table: {
                        contentToolbar: ['tableColumn', 'tableRow', 'mergeTableCells'],
                    },
                    placeholder: placeholder || 'Start writing your content here...',
                    root: {
                        initialData: value || '',
                    },
                }}
                onReady={(editor: any) => {
                    editorRef.current = editor;
                    editor.editing.view.change((writer: any) => {
                        writer.setAttribute('spellcheck', 'true', editor.editing.view.document.getRoot());
                    });
                }}
                onChange={(_event: any, editor: any) => {
                    onChange(editor.getData());
                }}
            />
        </div>
    );
}
