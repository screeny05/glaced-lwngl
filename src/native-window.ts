import { glfw, GLFW, GLFWWindow, GLFWCursor } from '@glaced/glfw';

import * as EventEmitter from 'events';

export interface LoadableContext {
    [key: string]: any;
    loadContext(loadproc: (name: string) => number): void;
    bindingsApi: keyof typeof LoadableContextApi;
    bindingsVersion: string;
}

enum LoadableContextApi {
    gles1 = glfw.OPENGL_ES_API,
    gles2 = glfw.OPENGL_ES_API,
    gl = glfw.OPENGL_API,
}

enum WindowMode {
    fullscreen,
    windowedFullscreen,
    window
}

export interface NativeWindowOptions {
    width: number;
    height: number;
    title: string;
    isResizable: boolean;
    isVisible: boolean;
    isDecorated: boolean;
    isFocused: boolean;
    isAutoIconify: boolean;
    isFloating: boolean;
    isMaximized: boolean;
    isDoubleBuffered: boolean;
    windowMode: WindowMode;
    vsync: boolean;
    msaa: number;
    nextTickFn: (cb: () => void) => void;
    context: LoadableContext;
}

export interface NativeWindowOptionsArguments extends Partial<NativeWindowOptions> {
    context: LoadableContext;
}

const fakeContext: LoadableContext = <any>{ };

export class NativeWindow<Context extends LoadableContext> extends EventEmitter {
    static defaults: NativeWindowOptions = {
        width: 800,
        height: 600,
        title: '',
        isResizable: true,
        isVisible: true,
        isDecorated: true,
        isFocused: true,
        isAutoIconify: true,
        isFloating: false,
        isMaximized: false,
        isDoubleBuffered: true,
        windowMode: WindowMode.window,
        vsync: false,
        msaa: 4,
        nextTickFn: setImmediate,
        context: fakeContext
    };

    options: NativeWindowOptions;

    glfw: GLFW;
    context: Context;
    handle: GLFWWindow;

    // proxied to glfw via get/set
    private _width: number;
    private _height: number;
    private _title: string;

    fbWidth: number;
    fbHeight: number;

    isListenerAddedCursorPos: boolean = false;
    isListenerAddedKey: boolean = false;
    isListenerAddedMouseButton: boolean = false;

    isOpen: boolean = false;

    constructor(options: NativeWindowOptionsArguments){
        super();
        this.options = { ...NativeWindow.defaults, ...options };

        this.glfw = glfw;
        this.context = <Context>this.context;

        if(!this.context){
            throw new TypeError('NativeWindow: no context given.');
        }
        if(!LoadableContextApi[this.context.bindingsApi]){
            throw new TypeError('NativeWindow: Context of type ' + this.context.bindingsApi + ' is not yet supported.');
        }
        if(!this.glfw.init()){
            throw new Error('NativeWindow: unable to initialize GLFW');
        }

        this.glfw.setErrorCallback(this.onError.bind(this));

        this.setWindowHints();

        this._width = this.options.width;
        this._height = this.options.height;
        this._title = this.options.title;
        this.handle = this.glfw.createWindow(this.width, this.height, this.title);

        if(!this.handle){
            throw new Error('NativeWindow: unable to initialize Window');
        }

        this.isOpen = true;

        this.glfw.setFramebufferSizeCallback(this.handle, this.onFramebufferSize.bind(this));
        this.glfw.setWindowSizeCallback(this.handle, this.onWindowSize.bind(this));
        this.glfw.setWindowCloseCallback(this.handle, this.onWindowClose.bind(this));

        this.glfw.setCursorPosCallback(this.handle, this.onMousemove.bind(this));
        this.glfw.setKeyCallback(this.handle, this.onKey.bind(this));
        this.glfw.setMouseButtonCallback(this.handle, this.onMouseButton.bind(this));

        // init context
        this.glfw.makeContextCurrent(this.handle);
        this.context.loadContext(this.glfw.getProcAddress);


        this.glfw.swapInterval(this.options.vsync ? 1 : 0);

        const fbSize = this.glfw.getFramebufferSize(this.handle);
        this.fbWidth = fbSize.width;
        this.fbHeight = fbSize.height;
    }

    setWindowHints(){
        const [major, minor] = this.context.bindingsVersion.split('.', 2).map(parseInt);

        // context hints
        this.glfw.windowHint(this.glfw.CLIENT_API, LoadableContextApi[this.context.bindingsApi]);

        this.glfw.windowHint(this.glfw.CONTEXT_VERSION_MAJOR, major);
        this.glfw.windowHint(this.glfw.CONTEXT_VERSION_MINOR, minor);
        this.glfw.windowHint(this.glfw.SAMPLES, this.options.msaa);
        this.glfw.windowHint(this.glfw.DOUBLEBUFFER, +this.options.isDoubleBuffered);

        // window hints
        this.glfw.windowHint(this.glfw.RESIZABLE, +this.options.isResizable);
        this.glfw.windowHint(this.glfw.VISIBLE, +this.options.isVisible);
        this.glfw.windowHint(this.glfw.DECORATED, +this.options.isDecorated);
        this.glfw.windowHint(this.glfw.FOCUSED, +this.options.isFocused);
        this.glfw.windowHint(this.glfw.AUTO_ICONIFY, +this.options.isAutoIconify);
        this.glfw.windowHint(this.glfw.FLOATING, +this.options.isFloating);
        this.glfw.windowHint(this.glfw.MAXIMIZED, +this.options.isMaximized);

        this.emit('setWindowHints');
    }

    onError(code, message){
        this.emit('error', { code, message });
        console.log('GLFW ERR:', code, message);
    }

    onFramebufferSize(handle, width, height): void {
        if(handle !== this.handle){ return; }
        this.fbWidth = width;
        this.fbHeight = height;
        this.emit('framebufferResize');
    }

    onWindowSize(handle, width, height): void {
        if(handle !== this.handle){ return; }
        this._width = width;
        this._height = height;
        this.emit('resize');
    }

    onWindowClose(handle): void {
        if(handle !== this.handle){ return; }
        this.close();
    }

    onMousemove(handle, x, y): void {
        if(handle !== this.handle){ return; }
        this.emit('mousemove', { x, y });
    }

    onKey(handle, key, scancode, action, modes): void {
        if(handle !== this.handle){ return; }
        const data = { key, scancode, action, modes };
        this.emit('key', data);

        if(action === glfw.PRESS){
            this.emit('keydown', data);
        } else if(action === glfw.RELEASE){
            this.emit('keyup', data);
        }
    }

    onMouseButton(handle, button, action, mods): void {
        if(handle !== this.handle){ return; }
        const data = { handle, button, action, mods };
        this.emit('mousebutton', data);

        if(action === glfw.PRESS){
            this.emit('mousedown', data);
        } else if(action === glfw.RELEASE){
            this.emit('mouseup', data);
        }
    }

    close(): void {
        this.emit('beforeclose');
        this.isOpen = false;
        this.glfw.destroyWindow(this.handle);
        this.emit('close');
    }

    requestFrame(cb: (time: number) => void): void {
        if(!this.isOpen){
            return;
        }

        this.options.nextTickFn(() => {
            const time = this.glfw.getTime();

            cb(time);

            this.glfw.swapBuffers(this.handle);
            this.glfw.pollEvents();
        });
    }

    setSize(width, height): void {
        this.glfw.setWindowSize(this.handle, width, height);
        this._width = width;
        this._height = height;
    }

    get title(): string { return this._title; }
    get width(): number { return this._width; }
    get height(): number { return this._height; }

    set title(val: string){
        this.glfw.setWindowTitle(this.handle, val);
        this._title = val;
    }

    set width(width: number){
        this.setSize(width, this._height);
    }

    set height(height: number){
        this.setSize(this._width, height);
    }

    // proxies:
    // only those methods, the user can really do something with
    // and are not duplicated with proxied properties
    getClipboardString(): string {
        return this.glfw.getClipboardString(this.handle);
    }
    setClipboardString(content: string): void {
        return this.glfw.setClipboardString(this.handle, content);
    }
    getInputMode(_window: GLFWWindow, mode: number): number {
        return this.glfw.getInputMode(this.handle, mode);
    }
    setInputMode(mode: number, value: number): void {
        return this.glfw.setInputMode(this.handle, mode, value);
    }
    setCursor(_cursor: GLFWCursor): void {
        return this.glfw.setCursor(this.handle, _cursor);
    }
    setCursorPos(xpos: number, ypos: number): void {
        return this.glfw.setCursorPos(this.handle, xpos, ypos);
    }
}
