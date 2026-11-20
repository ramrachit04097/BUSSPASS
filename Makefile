CC = gcc
CFLAGS = -Wall -Wextra -O2

CGI_SRC = backend/buspass.c
CGI_BIN = cgi-bin/buspass.cgi

CONSOLE_SRC = console/buspass_console.c
CONSOLE_BIN = console/buspass_console

all: $(CGI_BIN) $(CONSOLE_BIN)

$(CGI_BIN): $(CGI_SRC) backend/buspass.h
	@mkdir -p cgi-bin
	$(CC) $(CFLAGS) $(CGI_SRC) -o $(CGI_BIN)
	@chmod +x $(CGI_BIN)

$(CONSOLE_BIN): $(CONSOLE_SRC)
	$(CC) $(CFLAGS) $(CONSOLE_SRC) -o $(CONSOLE_BIN)

clean:
	rm -f $(CGI_BIN) $(CONSOLE_BIN)
