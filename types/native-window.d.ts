/// <reference types="node" />
import * as EventEmitter from 'events';
export interface LoadableContext {
    [key: string]: any;
    loadContext(loadproc: (name: string) => number): void;
}
export interface NativeWindowOptions {
    width: number;
    height: number;
    title: string;
    vsync: boolean;
    msaa: number;
    contextVersionMajor: number;
    contextVersionMinor: number;
    nextTickFn: (cb: () => void) => void;
    context: LoadableContext;
}
export interface NativeWindowOptionsArguments extends Partial<NativeWindowOptions> {
    context: LoadableContext;
}
export declare class NativeWindow<Context extends LoadableContext> extends EventEmitter {
    static defaults: NativeWindowOptions;
    options: NativeWindowOptions;
    glfw: GLFW;
    context: Context;
    handle: GLFWWindow;
    private _width;
    private _height;
    private _title;
    fbWidth: number;
    fbHeight: number;
    isListenerAddedCursorPos: boolean;
    isListenerAddedKey: boolean;
    isListenerAddedMouseButton: boolean;
    isOpen: boolean;
    constructor(options: NativeWindowOptionsArguments);
    onError(code: any, message: any): void;
    onFramebufferSize(handle: any, width: any, height: any): void;
    onWindowSize(handle: any, width: any, height: any): void;
    onWindowClose(handle: any): void;
    onMousemove(handle: any, x: any, y: any): void;
    onKey(handle: any, key: any, scancode: any, action: any, modes: any): void;
    onMouseButton(handle: any, button: any, action: any, mods: any): void;
    close(): void;
    requestFrame(cb: (time: number) => void): void;
    setSize(width: any, height: any): void;
    title: string;
    width: number;
    height: number;
    getClipboardString(): string;
    setClipboardString(content: string): void;
    getInputMode(_window: GLFWWindow, mode: number): number;
    setInputMode(mode: number, value: number): void;
    setCursor(_cursor: GLFWCursor): void;
    setCursorPos(xpos: number, ypos: number): void;
}
