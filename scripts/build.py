# just put together all the static resources :)

import re
import uuid

include_re = re.compile("^[ ]*<include([ ]+fmt=([a-zA-Z]*))*>(.*?)</include>")

class FileProcessor:

    def __init__(self, fname:str, ftype:list=[]):
        self.fname:str = fname
        self.ftype:list = ftype if ftype else self.detect_ftype()

    def detect_ftype(self) -> list:
        fname_split = self.fname.split('.')
        exts = fname_split[-(len(fname_split)-1):]
        return exts

    @property
    def process(self):
        return {
            'txt': self.process_txt,
            'css': self.process_css,
            'md': self.process_md,
            'js': self.process_js
        }[self.ftype[-1]]

    def process_txt(self):
        lines = None
        with open(self.fname, 'r') as f:
            lines = [l.replace(' ', '&nbsp;').replace("\n", "<br/>") for l in f.readlines()]
        
        return ''.join(lines)
    
    def process_css(self):
        css = None
        with open(self.fname, 'r') as f:
            css = f.read()
        
        if css:
            return f"<style>\n{css}\n</style>"
    
    def process_md(self):
        """ we will use marked to directly load the included markdown :)"""
        elid = uuid.uuid4()
        with open(self.fname, 'r') as f:
            return f'<div id="{elid}"></div><script>document.addEventListener("DOMContentLoaded", function(event) {{renderEl("{elid}",`{f.read()}`);}});</script>'

    def process_js(self):
        script_type = "module" if (len(self.ftype) >= 2 and self.ftype[-2] == 'esm') else "text/javascript"
        with open(self.fname, 'r') as f:
            return f'<script type="{script_type}">{f.read()}</script>'


def build(template_file, output_file):
    with open(template_file, 'r') as template:
        tlines = template.readlines()

        for i,l in zip(range(len(tlines)), tlines):
            m = include_re.match(l)
            if m:
                #print(m)
                #print(m.groups())
                include_file = m.groups()[-1]
                tlines[i] = FileProcessor(include_file).process()

    with open(output_file, 'w') as output:
        output.writelines(tlines)

def hash(file_path):
    from hashlib import sha256
    from os.path import isdir

    if isdir(file_path):
        return b''
    with open(file_path, "rb") as f:
        file_hash = sha256(f.read()).hexdigest()
    return file_hash

def watch(targets, callback):
    from time import sleep
    from glob import glob
    from itertools import chain

    callback()
    
    def scan_targets():
        return set([(tf, hash(tf))  for tf in chain(*[glob(t, recursive=True) for t in targets]) if 'index.html' not in tf])

    old_targets = scan_targets()
    #print(old_targets)
    while(True):
        new_targets = scan_targets()
        if new_targets != old_targets:
            old_targets = new_targets
            print("[!] REBUILDING")
            callback()

        sleep(0.8)


if __name__ == "__main__":
    import sys

    def buildit():
        TEMPLATE = 'static/template.html'
        OUTPUT = 'index.html'
        build(TEMPLATE, OUTPUT)

    if len(sys.argv) < 2:
        buildit()
    else:
        arg = sys.argv[1]   
        if arg == '-w' or arg == '--watch' :
            watch(['./**'], buildit)