#version 330 core

in vec2 vPosition;
in vec3 vColor;
out vec4 fColor;

void main()
{
    fColor = vec4(vColor, 1.0);
    gl_Position = vec4(vPosition, 0.0, 1.0);
}
