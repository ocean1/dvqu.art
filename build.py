from mwg import MicroWebGen, FileProcessor

class CustomFileProcessor(FileProcessor):

    def __init__(self, fname, ftype = ""):
        custom_processors = {'ascii': self.process_ascii}
        super().__init__(fname, ftype, custom_processors=custom_processors)

    def process_ascii(self):
        lines = None
        with open(self.fname, 'r') as f:
            lines = [l.replace(' ', '<span class="gspace">&nbsp;</span>').replace("\n", "<br/>") for l in f.readlines()]
        
        return ''.join(lines)


if __name__ == "__main__":
    import sys

    mwg = MicroWebGen(excludes=['build.py','Makefile'], file_processor=CustomFileProcessor)

    if len(sys.argv) < 2:
        mwg.build()
    else:
        arg = sys.argv[1]   
        if arg == '-w' or arg == '--watch' :
            mwg.watch(['./**'])