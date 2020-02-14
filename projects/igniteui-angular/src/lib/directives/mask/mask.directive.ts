import { CommonModule } from '@angular/common';
import {
    Directive, ElementRef, EventEmitter, HostListener,
    Output, PipeTransform, Renderer2,
    Input, NgModule, OnInit, AfterViewChecked,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { DeprecateProperty } from '../../core/deprecateDecorators';
import { MaskParsingService } from './mask-parsing.service';
import { isIE, IBaseEventArgs, KEYCODES, isEdge } from '../../core/utils';

const noop = () => { };

@Directive({
    providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: IgxMaskDirective, multi: true }],
    selector: '[igxMask]'
})
export class IgxMaskDirective implements OnInit, AfterViewChecked, ControlValueAccessor {
    /**
     * Sets the input mask.
     * ```html
     * <input [igxMask] = "'00/00/0000'">
     * ```
     */
    @Input('igxMask')
    public mask: string;

    /**
     * Sets the character representing a fillable spot in the input mask.
     * Default value is "'_'".
     * ```html
     * <input [promptChar] = "'/'">
     * ```
     */
    @Input()
    public promptChar = '_';

    /**
     * Specifies if the bound value includes the formatting symbols.
     * ```html
     * <input [includeLiterals] = "true">
     * ```
     */
    @Input()
    public includeLiterals: boolean;

    /**
     * Specifies a placeholder.
     * ```html
     * <input placeholder = "enter text...">
     * ```
     */
    @DeprecateProperty('"placeholder" is deprecated, use native placeholder instead.')
    public set placeholder(val: string) {
        this.renderer.setAttribute(this.nativeElement, 'placeholder', val);
    }

    public get placeholder(): string {
        return this.nativeElement.placeholder;
    }

    /**
     * Specifies a pipe to be used on blur.
     * ```html
     * <input [displayValuePipe] = "displayFormatPipe">
     * ```
     */
    @Input()
    public displayValuePipe: PipeTransform;

    /**
     * Specifies a pipe to be used on focus.
     * ```html
     * <input [focusedValuePipe] = "inputFormatPipe">
     * ```
     */
    @Input()
    public focusedValuePipe: PipeTransform;

    /**
     * Emits an event each time the value changes.
     * Provides `rawValue: string` and `formattedValue: string` as event arguments.
     * ```html
     * <input (onValueChange) = "onValueChange(rawValue: string, formattedValue: string)">
     * ```
     */
    @Output()
    public onValueChange = new EventEmitter<IMaskEventArgs>();

    /** @hidden @internal; */
    protected get inputValue(): string {
        return this.nativeElement.value;
    }

    /** @hidden @internal */
    protected set inputValue(val) {
        this.nativeElement.value = val;
    }

    /** @hidden */
    protected get maskOptions() {
        const format = this.mask || 'CCCCCCCCCC';
        const promptChar = this.promptChar && this.promptChar.substring(0, 1);
        return { format, promptChar };
    }

    private get selectionStart(): number {
        return isEdge() && this._hasDropAction ?
            this.nativeElement.selectionStart - this.valueToParse.length :
            this.nativeElement.selectionStart;
    }

    private get selectionEnd(): number {
        return this.nativeElement.selectionEnd;
    }

    private get nativeElement(): HTMLInputElement {
        return this.elementRef.nativeElement;
    }

    private get clipboardData(): string {
        return this.inputValue.substring(this._cursor, this.selectionStart);
    }

    private get valueToParse(): string {
        if (this._hasDropAction) {
            return this._droppedData;
        }

        return this.clipboardData;
    }

    private _key: number;
    private _oldVal: any;
    private _selection = 0;
    private _cursor: number;
    private _dataValue: string;
    private _droppedData: string;
    private _hasDropAction: boolean;
    private _stopPropagation: boolean;

    private _onTouchedCallback: () => void = noop;
    private _onChangeCallback: (_: any) => void = noop;

    constructor(
        protected elementRef: ElementRef,
        protected maskParser: MaskParsingService,
        protected renderer: Renderer2) { }

    /** @hidden */
    public ngOnInit(): void {
        this.renderer.setAttribute(this.nativeElement, 'placeholder',
            this.placeholder ? this.placeholder : this.maskOptions.format);
    }

    /** @hidden */
    public ngAfterViewChecked(): void {
        this._oldVal = this.inputValue;
    }

    /** @hidden */
    @HostListener('keydown', ['$event'])
    public onKeyDown(event): void {
        if (isIE() && this._stopPropagation) {
            this._stopPropagation = false;
        }

        const key = event.keyCode || event.charCode;
        if ((key === KEYCODES.Ctrl && key === KEYCODES.Z) || (key === KEYCODES.Ctrl && key === KEYCODES.Y)) {
            event.preventDefault();
        }

        this._key = key;
        this._cursor = this.selectionStart;
        this._selection = Math.abs(this.selectionEnd - this.selectionStart);
    }

    /** @hidden */
    @HostListener('input', ['$event'])
    public onInputChanged(event: InputEvent): void {
        if (isIE() && this._stopPropagation) {
            this._stopPropagation = false;
            return;
        }

        const valueToParse = event.data || this.valueToParse;
        const hasDeleteAction = (this._key === KEYCODES.BACKSPACE) || (this._key === KEYCODES.DELETE);
        this._cursor = this._hasDropAction ? this.selectionStart : this.updateCursorOnPasteOrDelete(hasDeleteAction, event);
        const parsedData = this.maskParser.parseMaskValue(
            this._oldVal, this.inputValue, this.maskOptions, this._cursor,
            valueToParse, this._selection, hasDeleteAction);
        this.inputValue = parsedData.value;
        this.setSelectionRange(parsedData.cursor);

        const rawVal = this.maskParser.restoreValueFromMask(this.inputValue, this.maskOptions);
        this._dataValue = this.includeLiterals ? this.inputValue : rawVal;
        this._onChangeCallback(this._dataValue);

        this.onValueChange.emit({ rawValue: rawVal, formattedValue: this.inputValue });
        this.afterInput();
    }

    /** @hidden */
    @HostListener('paste')
    public onPaste(): void {
        this._oldVal = this.inputValue;
        this._cursor = this.selectionStart;
    }

    /** @hidden */
    @HostListener('focus', ['$event'])
    public onFocus(event: FocusEvent): void {
        this.showMask((event.target as HTMLInputElement).value);
    }

    /** @hidden */
    @HostListener('blur', ['$event.target.value'])
    public onBlur(value: string): void {
        if (this.displayValuePipe) {
            this.inputValue = this.displayValuePipe.transform(value);
        } else if (value === this.maskParser.parseMask(null, this.maskOptions)) {
            this.inputValue = '';
        }
        this._onTouchedCallback();
    }

    /** @hidden */
    @HostListener('dragover')
    public onDragOver(): void {
        this.showMask('');
    }

    /** @hidden */
    @HostListener('drop', ['$event'])
    public onDrop(event: DragEvent): void {
        this._hasDropAction = true;
        this._droppedData = event.dataTransfer.getData('text');
    }

    /** @hidden */
    protected showMask(value: string) {
        if (this.focusedValuePipe) {
            if (isIE()) {
                this._stopPropagation = true;
            }
            this.inputValue = this.focusedValuePipe.transform(value);
        } else {
            this.inputValue = this.maskParser.parseMask(this.inputValue, this.maskOptions);
        }
    }

    private setSelectionRange(start: number, end: number = start): void {
        this.nativeElement.setSelectionRange(start, end);
    }

    private updateCursorOnPasteOrDelete(hasDeleteAction: boolean, event: InputEvent): number {
        if (hasDeleteAction) {
            // delete
            return this.selectionStart - 1;
        } else if (event.data) {
            // input
            return this._cursor;
        }

        // paste
        return this.selectionStart - this.clipboardData.length;
    }

    private afterInput() {
        this._oldVal = this.inputValue;
        this._hasDropAction = false;
        this._selection = 0;
        this._key = null;
    }

    /** @hidden */
    public writeValue(value: string): void {
        if (this.promptChar && this.promptChar.length > 1) {
            this.maskOptions.promptChar = this.promptChar.substring(0, 1);
        }

        this.inputValue = value ? this.maskParser.parseMask(value, this.maskOptions) : '';
        if (this.displayValuePipe) {
            this.inputValue = this.displayValuePipe.transform(this.inputValue);
        }

        this._dataValue = this.includeLiterals ? this.inputValue : value;
        this._onChangeCallback(this._dataValue);

        this.onValueChange.emit({ rawValue: value, formattedValue: this.inputValue });
    }

    /** @hidden */
    public registerOnChange(fn: (_: any) => void): void { this._onChangeCallback = fn; }

    /** @hidden */
    public registerOnTouched(fn: () => void): void { this._onTouchedCallback = fn; }
}

/**
 * The IgxMaskModule provides the {@link IgxMaskDirective} inside your application.
 */
export interface IMaskEventArgs extends IBaseEventArgs {
    rawValue: string;
    formattedValue: string;
}

/** @hidden */
@NgModule({
    declarations: [IgxMaskDirective],
    exports: [IgxMaskDirective],
    imports: [CommonModule]
})
export class IgxMaskModule { }
