import os
import re

std_nav = """      <div class="nav-links">
        <a href="index.html?tab=hadith" class="nav-link">
          <i data-lucide="book-open-check" class="w-4 h-4"></i>
          الحديث الشريف
        </a>
        <a href="index.html?tab=scholars" class="nav-link">
          <i data-lucide="users" class="w-4 h-4"></i>
          تراجم العلماء
        </a>
        <a href="index.html?tab=history" class="nav-link">
          <i data-lucide="scroll" class="w-4 h-4"></i>
          سير الأعلام
        </a>
        <a href="index.html?tab=jarh" class="nav-link">
          <i data-lucide="scale" class="w-4 h-4"></i>
          الجرح والتعديل
        </a>
        <a href="index.html?tab=fatawa" class="nav-link">
          <i data-lucide="book" class="w-4 h-4"></i>
          موسوعة الفتاوى
        </a>
        <a href="index.html?tab=firebase" class="nav-link">
          <i data-lucide="database" class="w-4 h-4"></i>
          بحث Firebase
        </a>
      </div>"""

cwd = '/Users/xmax/Desktop/fatawa-seo-main'

for filename in os.listdir(cwd):
    if filename.endswith(".html") and filename != "index.html":
        filepath = os.path.join(cwd, filename)
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
            
        # Match <div class="nav-links"> ... </div>
        # Use regex to replace
        pattern = re.compile(r'<div class="nav-links">.*?</div>', re.DOTALL)
        if pattern.search(content):
            new_content = pattern.sub(std_nav, content)
            
            # Simple heuristic to make the current link active
            if 'fatwa' in filename or 'algolia' in filename:
                new_content = new_content.replace('href="index.html?tab=fatawa" class="nav-link"', 'href="index.html?tab=fatawa" class="nav-link active"')
            elif 'hadith' in filename:
                new_content = new_content.replace('href="index.html?tab=hadith" class="nav-link"', 'href="index.html?tab=hadith" class="nav-link active"')
            elif 'scholars' in filename:
                new_content = new_content.replace('href="index.html?tab=scholars" class="nav-link"', 'href="index.html?tab=scholars" class="nav-link active"')
            elif 'jarh' in filename:
                new_content = new_content.replace('href="index.html?tab=jarh" class="nav-link"', 'href="index.html?tab=jarh" class="nav-link active"')
            elif 'history' in filename:
                new_content = new_content.replace('href="index.html?tab=history" class="nav-link"', 'href="index.html?tab=history" class="nav-link active"')
            elif 'firebase' in filename:
                new_content = new_content.replace('href="index.html?tab=firebase" class="nav-link"', 'href="index.html?tab=firebase" class="nav-link active"')
                
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f"Updated {filename}")
