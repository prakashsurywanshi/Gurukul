import { useEffect, useRef, useState } from 'react';
import { CKEditor } from '@ckeditor/ckeditor5-react';
import {
    Alignment,
    BlockQuote,
    Bold,
    ClassicEditor,
    CodeBlock,
    Essentials,
    GeneralHtmlSupport,
    Heading,
    Image,
    ImageCaption,
    ImageToolbar,
    Indent,
    IndentBlock,
    Italic,
    Link,
    List,
    Paragraph,
    SourceEditing,
    Table,
    TableToolbar,
} from 'ckeditor5';
import 'ckeditor5/ckeditor5.css';

/**
 * Rich-text editor for page-flow templates.
 *
 * Flow twins are raw printable HTML with `{{token}}` placeholders, inline
 * styles, tables and — for 20 of the library designs — leading `<style>`
 * blocks that carry `@page` / print rules. CKEditor's WYSIWYG pipeline cannot
 * faithfully hold `<style>` elements, so those blocks are split out into a raw
 * source pane and re-joined with the edited body on every change. The body
 * itself is edited with full HTML support (GeneralHtmlSupport allow-all +
 * raw `SourceEditing`) so inline styles, tables, images and placeholder text
 * survive the round trip.
 */

export interface FlowEditorApi {
    insertToken: (token: string) => void;
}

interface FlowContentEditorProps {
    value: string;
    onChange: (content: string) => void;
    apiRef?: React.MutableRefObject<FlowEditorApi | null>;
}

export function splitStyleBlocks(html: string): { styleBlock: string; body: string } {
    if (!html) return { styleBlock: '', body: '' };
    const blocks = html.match(/<style[\s\S]*?<\/style\s*>/gi) ?? [];
    return {
        styleBlock: blocks.join('\n'),
        body: html.replace(/<style[\s\S]*?<\/style\s*>/gi, ''),
    };
}

export function joinStyleBlocks(styleBlock: string, body: string): string {
    const style = (styleBlock ?? '').trim();
    return style ? `${style}\n${body ?? ''}` : (body ?? '');
}

export default function FlowContentEditor({ value, onChange, apiRef }: FlowContentEditorProps) {
    const editorRef = useRef<any>(null);
    const styleRef = useRef<string>('');

    const parsed = splitStyleBlocks(value ?? '');
    const [styleBlock, setStyleBlock] = useState(parsed.styleBlock);

    useEffect(() => {
        setStyleBlock((current) => {
            if (current === parsed.styleBlock) return current;
            return parsed.styleBlock;
        });
    }, [parsed.styleBlock]);

    styleRef.current = styleBlock;

    const emit = (bodyHtml: string) => {
        onChange(joinStyleBlocks(styleRef.current, bodyHtml));
    };

    const handleStyleChange = (next: string) => {
        setStyleBlock(next);
        onChange(joinStyleBlocks(next, editorRef.current?.getData() ?? parsed.body));
    };

    const insertToken = (token: string) => {
        const editor = editorRef.current;
        if (!editor) return;
        editor.model.change((writer: any) => {
            writer.insertText(token, editor.model.document.selection.getFirstPosition());
        });
        editor.editing.view.focus();
    };

    return (
        <div className="flow-content-editor space-y-3">
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
                        Alignment,
                        CodeBlock,
                        Image,
                        ImageToolbar,
                        ImageCaption,
                        SourceEditing,
                        GeneralHtmlSupport,
                    ],
                    toolbar: {
                        items: [
                            'undo',
                            'redo',
                            '|',
                            'heading',
                            '|',
                            'bold',
                            'italic',
                            '|',
                            'bulletedList',
                            'numberedList',
                            '|',
                            'alignment',
                            '|',
                            'outdent',
                            'indent',
                            '|',
                            'blockQuote',
                            'insertTable',
                            '|',
                            'link',
                            '|',
                            'sourceEditing',
                            'codeBlock',
                        ],
                        shouldNotGroupWhenFull: true,
                    },
                    heading: {
                        options: [
                            { model: 'paragraph', title: 'Paragraph', class: 'ck-heading_paragraph' },
                            { model: 'heading1', view: 'h1', title: 'Heading 1', class: 'ck-heading_heading1' },
                            { model: 'heading2', view: 'h2', title: 'Heading 2', class: 'ck-heading_heading2' },
                            { model: 'heading3', view: 'h3', title: 'Heading 3', class: 'ck-heading_heading3' },
                        ],
                    },
                    table: {
                        contentToolbar: ['tableColumn', 'tableRow', 'mergeTableCells'],
                    },
                    image: {
                        toolbar: ['imageTextAlternative'],
                    },
                    // Preserve the full design: allow every tag with any
                    // attribute, class and inline style on the way in/out.
                    htmlSupport: {
                        allow: [{ name: /.*/, attributes: true, classes: true, styles: true }],
                    },
                    placeholder: 'Start writing your template content here...',
                    root: {
                        initialData: parsed.body || '',
                    },
                }}
                onReady={(editor: any) => {
                    editorRef.current = editor;
                    apiRef?.current?.insertToken;
                    if (apiRef) {
                        apiRef.current = { insertToken };
                    }
                }}
                onChange={(_event: any, editor: any) => {
                    emit(editor.getData());
                }}
            />

            {parsed.styleBlock !== '' && (
                <details className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                    <summary className="cursor-pointer text-xs font-medium text-slate-600 dark:text-slate-300">
                        Page styles &amp; @page rules — edited as raw CSS
                    </summary>
                    <textarea
                        aria-label="Page styles"
                        value={styleBlock}
                        onChange={(e) => handleStyleChange(e.target.value)}
                        rows={6}
                        spellCheck={false}
                        className="mt-2 w-full resize-y rounded-md border border-slate-300 bg-slate-50 p-2 font-mono text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                    />
                </details>
            )}
        </div>
    );
}