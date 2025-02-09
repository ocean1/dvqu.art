# just put together all the static resources :)

import re
import uuid
from hashlib import sha256
from os.path import isdir
from time import sleep
from glob import glob
from itertools import chain


include_re = re.compile("^[ ]*<include([ ]+fmt=([a-zA-Z]*))*>(.*?)</include>")


class FileProcessor:

    def __init__(self, fname:str, ftype:str="", custom_processors={}):
        self.fname:str = fname
        self._ftype = ftype
        self.custom_processors = custom_processors

    @property
    def file_exts(self) -> list:
        fname_split = self.fname.split('.')
        exts = fname_split[-(len(fname_split)-1):]
        return exts

    @property
    def ftype(self):
        return self._ftype if self._ftype else self.file_exts[-1]

    @property
    def process(self):
        if self.ftype in self.custom_processors:
            return self.custom_processors[self.ftype]
        
        # fall back to default processor
        return {
            'txt': self.process_txt,
            'css': self.process_css,
            'md': self.process_md,
            'js': self.process_js
        }[self.ftype]

    def process_txt(self):
        lines = None
        with open(self.fname, 'r') as f:
            lines = [l.replace(' ', '<span class="gspace">&nbsp;</span>').replace("\n", "<br/>") for l in f.readlines()]
        
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


class MicroWebGen:

    TEMPLATE = 'static/template.html'
    OUTPUT = 'index.html'
    EXCLUDES = ['mwg/', ]

    def __init__(self, template=TEMPLATE, output=OUTPUT, excludes:list=[], scan_interval=1, file_processor=FileProcessor):
        self._template = template
        self._output = output
        self._template_file = None
        self._output_file = None
        self.exclude:list = excludes
        self.exclude.extend(MicroWebGen.EXCLUDES)
        self.exclude.append(output)
        self.scan_interval = scan_interval
        self.file_processor = FileProcessor
    
    @property
    def template(self):
        if self._template_file is None:
            self._template_file = open(self._template)

        return self._template_file
        
    @property
    def output(self):
        if self._output_file is None:
            self._output_file = open(self._output, 'w')

        return self._output_file
    
    def close_files(self):
        if self._template_file:
            self._template_file.close()
            self._template_file = None
        
        if self._output_file:
            self._output_file.close()
            self._output_file = None

    def process_include(self, file):
        return self.file_processor(file).process()

    def build(self):
        tlines = self.template.readlines()

        for i,l in zip(range(len(tlines)), tlines):
            m = include_re.match(l)
            if m:
                include_file = m.groups()[-1]
                tlines[i] = self.process_include(include_file)

        self.output.writelines(tlines)

        self.close_files()

    @staticmethod
    def hash_file(file_path):
        if isdir(file_path):
            return b''
        with open(file_path, "rb") as f:
            file_hash = sha256(f.read()).hexdigest()
        return file_hash

    def is_excluded(self, target):
        return any([exclusion in target for exclusion in self.exclude])

    def watch(self, targets, callback=None):
        if callback is None:
            callback = self.build
        callback()

        def scan_targets():
            return set(
                    [(tf, MicroWebGen.hash_file(tf))  for tf in chain(*[glob(t, recursive=True) for t in targets]
                ) if not self.is_excluded(tf)])

        old_targets = []
        #print(old_targets)
        while(True):
            try:
                new_targets = scan_targets()
                if new_targets != old_targets:
                    print("[!] REBUILDING")
                    callback()
                    new_targets = scan_targets()
                    old_targets = new_targets

                sleep(self.scan_interval)
            except KeyboardInterrupt:
                print("[!] DONE")
                break

    def __del__(self):
        self.close_files()


if __name__ == "__main__":
    import sys

    mwg = MicroWebGen()

    if len(sys.argv) < 2:
        mwg.build()
    else:
        arg = sys.argv[1]   
        if arg == '-w' or arg == '--watch' :
            mwg.watch(['./**'])