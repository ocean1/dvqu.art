serve:
	@python3 -m http.server 8080

build:
	@python3 scripts/build.py 

watch:
	@python3 scripts/build.py -w
