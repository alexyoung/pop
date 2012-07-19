TESTS = test/*.js

test:
	@./node_modules/.bin/mocha -u exports $(TESTS)

docs:
	@./node_modules/dox/bin/dox -t "Pop" -i doc/intro.md lib/*.js > doc/index.html

.PHONY: docs test cov
