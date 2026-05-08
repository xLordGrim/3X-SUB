import os
import re

def fix():
    with open('correct_sub.js', 'r', encoding='utf-8') as f:
        correct_js = f.read()

    with open('web/assets/css/premium.css', 'r', encoding='utf-8') as f:
        correct_css = f.read()

    with open('index.html', 'r', encoding='utf-8', errors='replace') as f:
        index_html = f.read()

    # Find the CSS block starting with :root {
    css_start_tag = '<style>'
    css_marker = ':root {'
    css_end_tag = '</style>'
    
    # Find the block that contains :root {
    css_blocks = list(re.finditer(r'<style>(.*?)</style>', index_html, re.DOTALL))
    for block in css_blocks:
        if css_marker in block.group(1):
            index_html = index_html[:block.start(1)] + "\n" + correct_css + "\n" + index_html[block.end(1):]
            break

    # Find the JS block starting with (function () {
    js_marker = '(function () {'
    js_blocks = list(re.finditer(r'<script>(.*?)</script>', index_html, re.DOTALL))
    for block in js_blocks:
        if js_marker in block.group(1):
            # Use string slicing to avoid re.sub escaping issues
            index_html = index_html[:block.start(1)] + "\n" + correct_js + "\n" + index_html[block.end(1):]
            break

    with open('index.html', 'w', encoding='utf-8') as f:
        f.write(index_html)
    print("Successfully updated index.html with UTF-8 encoding")

if __name__ == "__main__":
    fix()
