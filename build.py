from mwg import MicroWebGen

if __name__ == "__main__":
    import sys

    mwg = MicroWebGen(excludes=['build.py','Makefile'])

    if len(sys.argv) < 2:
        mwg.build()
    else:
        arg = sys.argv[1]   
        if arg == '-w' or arg == '--watch' :
            mwg.watch(['./**'])