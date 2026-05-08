import subprocess
import os
import re

def fix():
    # Get clean content directly from git to avoid PowerShell pipe corruption
    print("Fetching clean content from git...")
    sub_js = subprocess.check_output(['git', 'show', 'origin/main:web/assets/js/subscription.js'])
    prem_css = subprocess.check_output(['git', 'show', 'origin/main:web/assets/css/premium.css'])
    
    with open('correct_sub.js', 'wb') as f:
        f.write(sub_js)
    with open('correct_prem.css', 'wb') as f:
        f.write(prem_css)

    # Read the files as UTF-8
    sub_js_str = sub_js.decode('utf-8')
    prem_css_str = prem_css.decode('utf-8')

    # Read index.html
    # We use errors='replace' to read the corrupted file, but we will replace the corrupted blocks
    with open('index.html', 'r', encoding='utf-8', errors='replace') as f:
        index_html = f.read()

    # Find the CSS block starting with :root {
    # We'll use a more robust search for the style block containing :root
    css_blocks = list(re.finditer(r'<style>(.*?)</style>', index_html, re.DOTALL))
    found_css = False
    for block in css_blocks:
        if ':root {' in block.group(1):
            index_html = index_html[:block.start(1)] + "\n" + prem_css_str + "\n" + index_html[block.end(1):]
            found_css = True
            break
    
    if not found_css:
        print("Warning: Could not find CSS block with :root {")

    # Find the JS block starting with (function () {
    js_blocks = list(re.finditer(r'<script>(.*?)</script>', index_html, re.DOTALL))
    found_js = False
    for block in js_blocks:
        if '(function () {' in block.group(1):
            index_html = index_html[:block.start(1)] + "\n" + sub_js_str + "\n" + index_html[block.end(1):]
            found_js = True
            break

    if not found_js:
        print("Warning: Could not find JS block with (function () {")

    with open('index.html', 'w', encoding='utf-8') as f:
        f.write(index_html)
    
    print("Successfully updated index.html with clean UTF-8 content from git.")

    # Verification
    if 'Powered with ❤️ by 3𝕏 SUB' in index_html:
        print("Verification SUCCESS: Footer text is correct.")
    else:
        print("Verification FAILURE: Footer text not found or incorrect.")
        # Let's check what's there
        p = index_html.find('Powered with')
        if p != -1:
            print("Actual snippet:", repr(index_html[p:p+50]))

if __name__ == "__main__":
    fix()
