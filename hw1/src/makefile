GCC_OPTIONS=-Wall -pedantic -I../include
GL_OPTIONS=-framework OpenGL -framework GLUT
COPTIONS=$(GCC_OPTIONS) $(GL_OPTIONS)

all: prog

prog: initShader.o assn1.o
	g++ $(GL_OPTIONS) -o prog initShader.o assn1.o

initShader.o: initShader.cpp
	g++ $(GCC_OPTIONS) -c initShader.cpp

assn1.o: assn1.cpp
	g++ $(GCC_OPTIONS) -c assn1.cpp

clean:
	rm initShader.o
	rm assn1.o
	rm prog
