serve:
	@python3 -m http.server 8080

build:
	@python3 ./build.py 

watch:
	@python3 ./build.py -w
