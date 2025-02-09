# Who needs a static website generator, if it's a static website

It's been a bit of time that I wanted to revamp my personal website, but didn't really found time or inspiration to do so.
With a relaxing weekend and a bunch of hours to freely nerd at hand, my mind wandered to how I could possibly make bearable maintaining my personal website.

Aside from the general feeling of my personal website that I wanted to change, there was something haunting me: dependancies.
I seldom update my website, and having to recall commands, or worse having to fix broken dependancies is enough to drain the last bits of will I could have to update my personal website.
Having to juggle between npm, python, pandoc, haskell and whatnot to be able to push a simple post is *unacceptable*.

![Unacceptable](unacceptable-adventure-time.gif)

> Thou shalt not have dependencies outside of Bash, GNU utils, and Python with standard library.

For convenience, a Makefile is allowed too ;p.

The other thing that made me despise updating my website was being tied to the workflow that static website generators end up



``` python
class CustomFileProcessor(FileProcessor):

    def __init__(self, fname, ftype = ""):
        custom_processors = {'ascii': self.process_ascii}
        super().__init__(fname, ftype, custom_processors=custom_processors)

    def process_ascii(self):
        lines = None
        with open(self.fname, 'r') as f:
            lines = [
                l.replace(
                    ' ',
                    '<span class="gspace">&nbsp;</span>'
                ).replace("\n", "<br/>") for l in f.readlines()
            ]

        return ''.join(lines)
```

## Bonus glitchy logo

![Glitchy Logo](logo_glitch.gif)