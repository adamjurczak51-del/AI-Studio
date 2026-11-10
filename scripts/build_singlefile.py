import os
import glob
import re

def generate_standalone():
    dist_dir = 'dist'
    index_path = os.path.join(dist_dir, 'index.html')
    if not os.path.exists(index_path):
        print("dist/index.html not found, aborting standalone build.")
        return

    with open(index_path, 'r', encoding='utf-8') as f:
        html = f.read()

    # 1. Read and inline CSS
    css_files = glob.glob(os.path.join(dist_dir, 'assets', '*.css'))
    css_content = ''
    for c in css_files:
        with open(c, 'r', encoding='utf-8') as cf:
            css_content += cf.read() + '\n'

    # 2. Read and inline JS
    js_files = glob.glob(os.path.join(dist_dir, 'assets', '*.js'))
    js_content = ''
    for j in js_files:
        with open(j, 'r', encoding='utf-8') as jf:
            js_content += jf.read() + '\n'

    # Remove external css link and external script tag
    clean_html = re.sub(r'<link\s+rel="stylesheet"[^>]*>', '', html)
    clean_html = re.sub(r'<script\s+type="module"[^>]*></script>', '', clean_html)

    # Insert inlined style before </head>
    inlined_style = f"<style>\n{css_content}\n</style>\n</head>"
    standalone_html = clean_html.replace('</head>', inlined_style, 1)

    # Insert inlined script before </body>
    safe_js = js_content.replace('</script>', '<\\/script>')
    inlined_script = f"<script>\n{safe_js}\n</script>\n</body>"
    standalone_html = standalone_html.replace('</body>', inlined_script, 1)

    out_names = [
        'Domowy_Budzet_Aplikacja_Chmura_Live_Sync.html',
        'Domowy_Budzet_Offline_Standalone.html'
    ]

    for name in out_names:
        dist_out = os.path.join(dist_dir, name)
        with open(dist_out, 'w', encoding='utf-8') as out_f:
            out_f.write(standalone_html)
        print(f"Generated standalone HTML: {dist_out} ({os.path.getsize(dist_out)} bytes)")

        # Also copy to public
        public_out = os.path.join('public', name)
        with open(public_out, 'w', encoding='utf-8') as out_f:
            out_f.write(standalone_html)

if __name__ == '__main__':
    generate_standalone()
