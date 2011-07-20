TESTS = test/*.js

test:
	@./node_modules/.bin/expresso $(TESTS)
	@rm -r /tmp/pop-tests/

# Doesn't work at the moment
cov:
	@./node_modules/.bin/expresso -I lib --cov $(TESTS)

docs:
	@./node_modules/dox/bin/dox -t "Pop" -i doc/intro.md lib/*.js > doc/index.html

.PHONY: docs test cov
