
# Called by canvasCtrl
@initScene = (viewService, fileService, eye, orbit, lightEye, lightOrbit) ->
    canvasId = "main-canvas"
    window.scene = new window.Scene(canvasId)

    window.SHADER_DEFINITIONS = [
        attributes:
            "vPosition": new Attribute("vPosition", 'attribute'),
            "vNormal": new Attribute("vNormal", 'attribute')
        uniforms:
            "CameraProjection": new Attribute("CameraProjection", 'uniform', window.gl.uniformMatrix4fv, 'mat4fv'),
            "CameraView": new Attribute("CameraView", 'uniform', window.gl.uniformMatrix4fv, 'mat4fv'),
            "Model": new Attribute("Model", 'uniform', window.gl.uniformMatrix4fv, 'mat4fv'),
            "AmbientProduct": new Attribute("AmbientProduct", 'uniform', window.gl.uniform4fv, '4fv'),
            "DiffuseProduct": new Attribute("DiffuseProduct", 'uniform', window.gl.uniform4fv, '4fv'),
            "SpecularProduct": new Attribute("SpecularProduct", 'uniform', window.gl.uniform4fv, '4fv'),
            "LightPosition": new Attribute("LightPosition", 'uniform', window.gl.uniform4fv, '4fv'),
            "Shininess": new Attribute("Shininess", 'uniform', window.gl.uniform1f, '1f'),
            "LightProjection": new Attribute("LightProjection", 'uniform', window.gl.uniformMatrix4fv, 'mat4fv'),
            "LightView": new Attribute("LightView", 'uniform', window.gl.uniformMatrix4fv, 'mat4fv'),
            "ShadowMap": new Attribute("ShadowMap", 'uniform', window.gl.uniform1i, '1i'),
            "RenderingZBuffer": new Attribute("RenderingZBuffer", 'uniform', window.gl.uniform1i, '1i')
    ]

    camera = new window.Camera(viewService, eye, orbit)
    light = new window.Camera(viewService, lightEye, lightOrbit)
    shaderProgram = new window.ShaderProgram(0)

    LIGHT =
        position:[1.5, 1.5, 2.0, 1.0],
        ambient:[0.8, 0.8, 0.8, 1.0],
        diffuse:[1.0, 1.0, 1.0, 1.0],
        specular:[1.0, 1.0, 1.0, 1.0]

    MATERIAL =
        ambient:[1.0, 0.6, 0.0, 1.0],
        diffuse:[1.0, 0.8, 0.0, 1.0],
        specular:[1.0, 0.8, 0.0, 1.0],
        shininess:100.0
    
    ambientProduct = vec4.create()
    diffuseProduct = vec4.create()
    specularProduct = vec4.create()

    vec4.mul(ambientProduct, LIGHT.ambient, MATERIAL.ambient)
    vec4.mul(diffuseProduct, LIGHT.diffuse, MATERIAL.diffuse)
    vec4.mul(specularProduct, LIGHT.specular, MATERIAL.specular)

    shaderProgram.setAttrValue("LightPosition", LIGHT.position)

    shaderProgram.setAttrValue("AmbientProduct", ambientProduct)
    shaderProgram.setAttrValue("DiffuseProduct", diffuseProduct)
    shaderProgram.setAttrValue("SpecularProduct", specularProduct)

    shaderProgram.setAttrValue("Shininess",  MATERIAL.shininess)

    mouse = new window.Mouse()
    window.scene.init(camera, light, shaderProgram, mouse)
    return

class @Scene
	# Proper construction requires: canvasId, @camera, @light, @shaderProgram, @mouse
    constructor: (canvasId, @camera, @light, @shaderProgram, @mouse, @models) ->
        @canvas = document.getElementById(canvasId);
        @colorIdSequence = 0
        @initGL()
        @models = new Array()

    init: (camera, light, shaderProgram, mouse) ->
        @camera = camera
        @light = light
        @shaderProgram = shaderProgram
        @mouse = mouse

        @initShader()
        @initZBuffer()
        # camera assumed to be given in constructor and properly initialized
        @initEventHandlers()
        @drawScene()
		
    initGL: ->
        @resize()
        try
            gl = @canvas.getContext("experimental-webgl")
            gl = WebGLDebugUtils.makeDebugContext(gl)
            gl.viewportWidth = @canvas.width
            gl.viewportHeight = @canvas.height
        catch e
        	console.log(e)
        
        alert("Could not initialise WebGL, sorry :-(") unless gl?

        gl.clearColor(0.7, 0.7, 0.7, 1.0)
        gl.enable(gl.DEPTH_TEST)
        window.gl = gl

    initShader: -> @shaderProgram.init()

    initZBuffer: ->
        gl = window.gl
        texSize = $(@canvas).width()
        depthTexture = gl.createTexture()
        gl.bindTexture(gl.TEXTURE_2D, depthTexture)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, texSize, texSize, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
        
        # Creates framebuffer
        depthFrameBuffer = gl.createFramebuffer()
        gl.bindFramebuffer(gl.FRAMEBUFFER, depthFrameBuffer)
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, depthTexture, 0)
        gl.bindTexture(gl.TEXTURE_2D, depthTexture)
        gl.enable(gl.DEPTH_TEST)

        # create renderbuffer
        depthRenderBuffer = gl.createRenderbuffer()
        gl.bindRenderbuffer(gl.RENDERBUFFER, depthRenderBuffer)
        
        # allocate renderbuffer
        gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, texSize, texSize);  
        
        # attach renderebuffer
        gl.framebufferRenderbuffer(
            gl.FRAMEBUFFER,
            gl.DEPTH_ATTACHMENT,
            gl.RENDERBUFFER,
            depthRenderBuffer
        )
        
        alert("this combination of attachments does not work") if @framebufferNotComplete()

        @depthFrameBuffer = depthFrameBuffer
        @depthRenderBuffer = depthRenderBuffer
        @depthTexture = depthTexture
        @shaderProgram.setAttrValue("ShadowMap", depthTexture)
        gl.activeTexture(gl.TEXTURE0)
        gl.bindTexture(gl.TEXTURE_2D, depthTexture)

    resize: ->
        # Note: jQuery's resize event listener is triggered when
        #  an element is given fullscreen (e.g. requestFullscreen()) in Chrome,
        #  but not in Firefox.
        canvas = $(@canvas)
        parentWidth = canvas.parent().width()
        canvas.width(parentWidth)
        canvas.height(parentWidth)
        canvas.attr('width', parentWidth)
        canvas.attr('height', parentWidth)
        canvasWidth = canvas.width()
        canvasHeight = canvas.height()
        fullscreen = $("#fullscreen")
        fullscreen.css('top', 3 - canvas.height())
        fullscreen.css('left', canvas.width() - fullscreen.width() - 3 - 26)

    drawScene: ->
        gl = window.gl
        @shaderProgram.setAttrValue("RenderingZBuffer", true)
        gl.bindFramebuffer(gl.FRAMEBUFFER, @depthFrameBuffer)
        @draw()
        @shaderProgram.setAttrValue("RenderingZBuffer", false)
        gl.bindFramebuffer(gl.FRAMEBUFFER, null)
        @draw()

        # must bind the object, otherwise it will become detached
        # basically, requestAnimationFrame will be called and "this"
        # will be another object instead of the scene object that
        # we want to call this function from.
        requestAnimationFrame(@drawScene.bind(this))
        return

    draw: ->
        gl = window.gl
        gl.viewport(0, 0, $(@canvas).width(), $(@canvas).height())
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

        cameraProjection = @camera.getProjectionMatrix()
        @shaderProgram.setAttrValue('CameraProjection', cameraProjection)
        cameraView = @camera.getViewMatrix()
        @shaderProgram.setAttrValue('CameraView', cameraView)
        
        lightProjection = @light.getProjectionMatrix("Orthographic")
        @shaderProgram.setAttrValue('LightProjection', lightProjection)
        lightView = @light.getViewMatrix()
        @shaderProgram.setAttrValue('LightView', lightView)

        for model in @models
            model.draw(@shaderProgram) if model.active

    initEventHandlers: ->
        # Disable right mouse click browser menu
        document.oncontextmenu = -> false
        $(window).resize(@resize.bind(this))
        $(@canvas).mousemove(@onMouseMove.bind(this))
        $(@canvas).mousedown(@mouse.onClick.bind(@mouse))
        $(@canvas).mouseup(@mouse.onClick.bind(@mouse))

    onMouseMove: (event, target) ->
        mouse = @mouse
        mouse.onMove(event, target)
        if mouse.isDown and mouse.isDragging
            @camera.updateRotation()
            quat.copy(@light.orbitRot, @camera.orbitRot)

    getNextColorId: ->
        @colorIdSequence += 1
        return @colorIdSequence

    colorIdToUint8Array: (colorId) ->
        colorIdUint = new Uint8Array(4)
        colorIdUint[0] = colorId % 256
        colorIdUint[1] = Math.floor(colorId / 256) % 256
        colorIdUint[2] = Math.floor(colorId / (256 * 256)) % 256
        colorIdUint[3] = 255
        return colorIdUint

    framebufferNotComplete: -> window.gl.checkFramebufferStatus(window.gl.FRAMEBUFFER) != window.gl.FRAMEBUFFER_COMPLETE

    addModel: (file) -> @models.push(new window.Model(file.obj))

    selectedModelsChange: (files) ->
        for file in files
            for model in @models
                model.active = file.isSelected if model.modelId == file.obj.modelId


class @Mouse
    constructor: ->
        @x = 0
        @y = 0
        @deltaX = 0
        @deltaY = 0
        @isDown = false
        @isDragging = false

    onMove: (event, target) ->
        @isDragging = true;
        oldX = @x
        oldY = @y
        @updatePosition(event, target)
        @deltaX = @x - oldX
        @deltaY = @y - oldY

    onClick: (event, target) ->
        switch event.which
            when 1 then @isDown = !@isDown # Left Mouse Button
            when 3 then @isDown = !@isDown # Right Mouse Button
            when 2 then @isDown = !@isDown # Middle Mouse Button
            else alert('You have a strange Mouse!')

        # on mouseup set clicked = true if didn't drag
        @clicked = !@clicked if !@isDragging and !@isDown
        
        @isDragging = false

        @updatePosition(event, target) if @isDown

    updatePosition: (event, target) ->
        if document.mozFullScreen or document.webkitIsFullScreen
            @x = event.pageX
            @y = $(window.scene.canvas).height() - event.pageY
        else
            parentOffset = $(window.scene.canvas).parent().offset()
            @x = Math.round(event.pageX - parentOffset.left)
            @y = $(target).height() - Math.round(event.pageY - parentOffset.top)


class @Camera
    # Proper initialization requires: @viewService, @eye, @orbit
    constructor: (@viewService, @eye, @orbit, @eyeRot, @orbitRot, @direction) ->
        @direction = {
            x: [1, 0, 0],
            y: [0, 1, 0]
        }
        @eyeRot = quat.create()
        @orbitRot = quat.create()
        @lookAt()
        @setDirection()

    lookAt: ->
        lookAtMatrix = mat4.create()
        lookAtRotMatrix = mat4.create()
        mat4.lookAt(lookAtMatrix, @eye, @orbit, @direction.y)
        mat3.fromMat4(lookAtRotMatrix, lookAtMatrix)
        quat.fromMat3(@eyeRot, lookAtRotMatrix)

    setDirection: ->
        desiredUp = @direction.y
        right = vec3.create()
        up = vec3.create()
        forward = vec3.create()

        vec3.sub(forward, @orbit, @eye)

        vec3.normalize(forward, forward)
        vec3.normalize(desiredUp, desiredUp)

        vec3.cross(right, forward, desiredUp)
        vec3.normalize(right, right)

        vec3.cross(up, right, forward)
        vec3.normalize(up, up);

        @direction.x = right
        @direction.y = up

    getProjectionMatrix: (selectView) ->
        outMatrix = mat4.create()
        canvas = $(window.scene.canvas)
        view = @viewService.getSelectedViewForWebGL(selectView)
        canvasRatio = canvas.width() / canvas.height()
        switch view.viewType
            when 'Perspective'
                mat4.perspective(
                    outMatrix,
                    view.fovy,
                    view.ratio * canvasRatio,
                    view.near,
                    view.far
                )
            when 'Orthographic'
                orthoHeight = Math.abs(view.top - view.bottom)
                orthoWidth = Math.abs(view.left - view.right)
                orthoRatio = orthoWidth / orthoHeight
                deviation = Math.abs(canvasRatio - orthoRatio) / 2

                if orthoRatio > canvasRatio
                    heightDev = orthoWidth * deviation
                    widthDev = 0.0
                else
                    heightDev = 0.0
                    widthDev = orthoHeight * deviation

                mat4.ortho(
                    outMatrix,
                    view.left - widthDev,
                    view.right + widthDev,
                    view.bottom - heightDev,
                    view.top + heightDev,
                    view.near,
                    view.far
                )
            else
                alert("Unknown view type: ${view.viewType}\nView not set.")

        return outMatrix

    getViewMatrix: ->
        eye = vec3.create()
        vec3.sub(eye, @eye, @orbit)
        eyeMagnitude = @getMagnitude(eye)

        eyeMatrix = mat4.create()
        orbitMatrix = mat4.create()
        mat4.fromRotationTranslation(orbitMatrix, @orbitRot,  @orbit)
        mat4.fromRotationTranslation(eyeMatrix,   @eyeRot,    [0, 0, -eyeMagnitude])
        
        outMatrix = mat4.create()
        mat4.multiply(outMatrix, eyeMatrix, orbitMatrix)

        return outMatrix

    getMagnitude: (vec) -> Math.sqrt(vec[0] * vec[0] + vec[1] * vec[1] + vec[2] * vec[2])

    updateRotation: ->
        mouse = window.scene.mouse

        rotYaw = quat.create()
        quat.setAxisAngle(rotYaw, @direction.y,  @toRadians(mouse.deltaX))
        quat.multiply(@orbitRot, rotYaw, @orbitRot)
        quat.normalize(@orbitRot, @orbitRot)

        rotPitch = quat.create()
        quat.setAxisAngle(rotPitch, @direction.x,  -@toRadians(mouse.deltaY))
        quat.multiply(@orbitRot, rotPitch, @orbitRot)
        quat.normalize(@orbitRot, @orbitRot)

    toRadians: (degrees) -> degrees * (Math.PI / 180)


class @Model
    constructor: (fileObj) ->
        @modelId = fileObj.modelId
        @active = fileObj.active
        @vertices = fileObj.vertices
        @normals = fileObj.normals
        @faces = fileObj.faces
        @lineFaces = fileObj.lineFaces
        @translation = fileObj.translation
        @rotation = fileObj.rotation
        @scale = fileObj.scale
        @colorId = window.scene.getNextColorId()
        @colorId.asUint8Array = window.scene.colorIdToUint8Array(@colorId)
        @uniforms = new Array()
        @buffer()

    buffer: ->
        gl = window.gl
        @vertices.buffer = gl.createBuffer()
        @normals.buffer = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, @vertices.buffer)
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(@vertices), gl.STATIC_DRAW)
        gl.bindBuffer(gl.ARRAY_BUFFER, @normals.buffer)
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(@normals), gl.STATIC_DRAW)
        @faces.buffer = gl.createBuffer()
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, @faces.buffer)
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(@faces), gl.STATIC_DRAW)
        @lineFaces.buffer = gl.createBuffer()
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, @lineFaces.buffer)
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(@lineFaces), gl.STATIC_DRAW)

    addUniform: (uniform) -> uniforms.push(uniform)

    getModelMatrix: ->
        modelMatrix = mat4.create()
        mat4.mul(modelMatrix, modelMatrix, @translation)
        mat4.mul(modelMatrix, modelMatrix, @rotation)
        mat4.mul(modelMatrix, modelMatrix, @scale)
        return modelMatrix

    draw: ->
        gl = window.gl
        shaderProgram = window.scene.shaderProgram

        shaderProgram.setAttrValue("Model", @getModelMatrix())

        vPositionLoc = shaderProgram.getAttr("vPosition", "attribute").location
        gl.bindBuffer(gl.ARRAY_BUFFER, @vertices.buffer)
        gl.vertexAttribPointer(vPositionLoc, 3, gl.FLOAT, false, 0, 0)

        vNormalLoc = shaderProgram.getAttr("vNormal", "attribute").location
        gl.bindBuffer(gl.ARRAY_BUFFER, @normals.buffer)
        gl.vertexAttribPointer(vNormalLoc, 3, gl.FLOAT, false, 0, 0)

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, @faces.buffer)
        shaderProgram.setUniforms()
        gl.drawElements(gl.TRIANGLES, @faces.length, gl.UNSIGNED_SHORT, 0)


class @Attribute
    constructor: (@varName, @attrType, @setAttrFunc, @attrValueType, @location, @attrValue) ->

    initLocation: (shaderProgram) ->
        if @attrType == 'attribute'
            @location = window.gl.getAttribLocation(shaderProgram, @varName)
            window.gl.enableVertexAttribArray(@location)
        else
            @location = window.gl.getUniformLocation(shaderProgram, @varName)

    # same as gl.uniformXX(shaderProgram.loc, value)
    setValueForShader: -> 
        gl = window.gl
        switch @attrValueType
            when 'mat4fv' then gl.uniformMatrix4fv(@location, false, @attrValue)
            when '4fv' then gl.uniform4fv(@location, @attrValue)
            when '1f' then gl.uniform1f(@location, @attrValue)
            when '1i' then gl.uniform1i(@location, @attrValue)
            else alert("Attribute: #{@varName} was not properly initialised: #{@attrValue}") # nothing


class @ShaderProgram
    # Proper initialization requires: shaderDefId
    constructor: (shaderDefId) ->
        @program = null
        @shaderDef = window.SHADER_DEFINITIONS[shaderDefId]
        @vertexShader = @getShader("#{shaderDefId}-shader-vs")
        @fragmentShader = @getShader("#{shaderDefId}-shader-fs")

    init: ->
        gl = window.gl

        shaderProgram = gl.createProgram()
        gl.attachShader(shaderProgram, @vertexShader)
        gl.attachShader(shaderProgram, @fragmentShader)
        gl.linkProgram(shaderProgram)

        alert("Could not initialise shaders") if @shaderInitError(shaderProgram)

        gl.useProgram(shaderProgram)

        for name, attribute of @shaderDef.attributes
            attribute.initLocation(shaderProgram)

        for name, uniform of @shaderDef.uniforms
            uniform.initLocation(shaderProgram)

        @program = shaderProgram

    getShader: (htmlId) ->
        gl = window.gl
        shaderScript = document.getElementById(htmlId)
        
        return null unless shaderScript?

        str = ''
        k = shaderScript.firstChild
        while k
            if k.nodeType == 3
                str += k.textContent
            k = k.nextSibling

        shader = switch shaderScript.type
            when 'x-shader/x-vertex'   then gl.createShader(gl.VERTEX_SHADER)
            when 'x-shader/x-fragment' then gl.createShader(gl.FRAGMENT_SHADER)
            else null
        
        return null unless shader?

        gl.shaderSource(shader, str)
        gl.compileShader(shader)

        alert(gl.getShaderInfoLog(shader)) if @shaderCompilationError(shader) 

        return shader

    shaderInitError: (shaderProgram) -> !gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)

    shaderCompilationError: (shader) -> !gl.getShaderParameter(shader, gl.COMPILE_STATUS)

    setUniforms: -> uniform.setValueForShader() for name, uniform of @shaderDef.uniforms

    setAttrValue: (name, value) -> @shaderDef.uniforms[name].attrValue = value

    getAttr: (name, type) -> if type is "attribute" then @shaderDef.attributes[name] else @shaderDef.uniforms[name]





