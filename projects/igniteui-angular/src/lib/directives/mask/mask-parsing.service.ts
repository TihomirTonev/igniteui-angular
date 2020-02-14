import { Injectable } from '@angular/core';

/**
 * @hidden
 */
export const MASK_FLAGS = ['C', '&', 'a', 'A', '?', 'L', '9', '0', '#'];

/**
 * @hidden
 */
@Injectable({
    providedIn: 'root'
})
export class MaskParsingService {
    private _cursor;

    public parseMask(inputVal: string, maskOptions: any): string {
        let outputVal = '';
        let value = '';
        const mask: string = maskOptions.format;
        const literals: Map<number, string> = this.getMaskLiterals(mask);
        const literalKeys: number[] = Array.from(literals.keys());
        const nonLiteralIndices: number[] = this.getNonLiteralIndices(mask, literalKeys);
        const literalValues: string[] = Array.from(literals.values());

        if (inputVal != null) {
            value = inputVal.toString();
        }

        for (const maskSym of mask) {
            outputVal += maskOptions.promptChar;
        }

        literals.forEach((val: string, key: number) => {
            outputVal = this.replaceCharAt(outputVal, key, val);
        });

        if (!value) {
            return outputVal;
        }

        const nonLiteralValues: string[] = this.getNonLiteralValues(value, literalValues);

        for (let i = 0; i < nonLiteralValues.length; i++) {
            const char = nonLiteralValues[i];
            const isCharValid = this.validateCharOnPosition(char, nonLiteralIndices[i], mask);

            if (!isCharValid && char !== maskOptions.promptChar) {
                nonLiteralValues[i] = maskOptions.promptChar;
            }
        }

        if (nonLiteralValues.length > nonLiteralIndices.length) {
            nonLiteralValues.splice(nonLiteralIndices.length);
        }

        let pos = 0;
        for (const nonLiteralValue of nonLiteralValues) {
            const char = nonLiteralValue;
            outputVal = this.replaceCharAt(outputVal, nonLiteralIndices[pos++], char);
        }

        return outputVal;
    }

    public restoreValueFromMask(value: string, maskOptions: any): string {
        let outputVal = '';
        const mask: string = maskOptions.format;
        const literals: Map<number, string> = this.getMaskLiterals(mask);
        const literalValues: string[] = Array.from(literals.values());

        for (const val of value) {
            if (literalValues.indexOf(val) === -1) {
                if (val !== maskOptions.promptChar) {
                    outputVal += val;
                }
            }
        }

        return outputVal;
    }

    public parseMaskValue(value: string, inputText: string, maskOptions: any,
        cursor: number, rawData: string, selection: number, hasDeleteAction: boolean): { value: string, cursor: number } {
        const mask: string = maskOptions.format;
        const literals: Map<number, string> = this.getMaskLiterals(mask);
        const literalKeys: number[] = Array.from(literals.keys());
        const nonLiteralIndices: number[] = this.getNonLiteralIndices(mask, literalKeys);
        const selectionEnd = cursor + selection;

        if (hasDeleteAction) {
            if (inputText === '') {
                this._cursor = 0;
                return { value: this.parseMask(inputText, maskOptions), cursor: this._cursor };
            }
            let i = 0;
            this._cursor = ++cursor;
            do {
                inputText = this.updateValue(nonLiteralIndices, inputText, cursor++, maskOptions, mask);
            } while (++i < selection);
            value = inputText;
        } else {
            this._cursor = cursor;
            for (const char of rawData) {
                if (this._cursor > mask.length) {
                    return { value: value, cursor: this._cursor };
                }

                if (nonLiteralIndices.indexOf(this._cursor) !== -1) {
                    const isCharValid = this.validateCharOnPosition(char, this._cursor, mask);
                    if (isCharValid) {
                        value = this.replaceCharAt(value, this._cursor++, char);
                    }
                } else {
                    for (let i = cursor; i < mask.length; i++) {
                        if (literalKeys.indexOf(this._cursor) !== -1) {
                            this._cursor++;
                        } else {
                            const isCharValid = this.validateCharOnPosition(char, this._cursor, mask);
                            if (isCharValid) {
                                value = this.replaceCharAt(value, this._cursor++, char);
                            }
                            break;
                        }
                    }
                }

                selection--;
            }

            if (selection > 0) {
                for (let i = this._cursor; i < selectionEnd; i++) {
                    if (literalKeys.indexOf(this._cursor) !== -1) {
                        this._cursor++;
                    } else {
                        value = this.replaceCharAt(value, this._cursor++, maskOptions.promptChar);
                    }
                }
            }
        }

        return { value: value, cursor: this._cursor };
    }

    private updateValue(nonLiteralIndices: number[], value: string, cursor: number, maskOptions: any, mask: string) {
        return nonLiteralIndices.indexOf(cursor) !== -1 ?
            this.insertCharAt(value, cursor, maskOptions.promptChar) :
            this.insertCharAt(value, cursor, mask[cursor]);
    }
    private validateCharOnPosition(inputChar: string, position: number, mask: string): boolean {
        let regex: RegExp;
        let isValid: boolean;
        const letterOrDigitRegEx = '[\\d\\u00C0-\\u1FFF\\u2C00-\\uD7FFa-zA-Z]';
        const letterDigitOrSpaceRegEx = '[\\d\\u00C0-\\u1FFF\\u2C00-\\uD7FFa-zA-Z\\u0020]';
        const letterRegEx = '[\\u00C0-\\u1FFF\\u2C00-\\uD7FFa-zA-Z]';
        const letterSpaceRegEx = '[\\u00C0-\\u1FFF\\u2C00-\\uD7FFa-zA-Z\\u0020]';
        const digitRegEx = '[\\d]';
        const digitSpaceRegEx = '[\\d\\u0020]';
        const digitSpecialRegEx = '[\\d-\\+]';

        switch (mask.charAt(position)) {
            case 'C':
                isValid = inputChar !== '';
                break;
            case '&':
                regex = new RegExp('[\\u0020]');
                isValid = !regex.test(inputChar);
                break;
            case 'a':
                regex = new RegExp(letterDigitOrSpaceRegEx);
                isValid = regex.test(inputChar);
                break;
            case 'A':
                regex = new RegExp(letterOrDigitRegEx);
                isValid = regex.test(inputChar);
                break;
            case '?':
                regex = new RegExp(letterSpaceRegEx);
                isValid = regex.test(inputChar);
                break;
            case 'L':
                regex = new RegExp(letterRegEx);
                isValid = regex.test(inputChar);
                break;
            case '0':
                regex = new RegExp(digitRegEx);
                isValid = regex.test(inputChar);
                break;
            case '9':
                regex = new RegExp(digitSpaceRegEx);
                isValid = regex.test(inputChar);
                break;
            case '#':
                regex = new RegExp(digitSpecialRegEx);
                isValid = regex.test(inputChar);
                break;
            default: {
                isValid = null;
            }
        }

        return isValid;
    }
    private replaceCharAt(strValue: string, index: number, char: string): string {
        if (strValue !== undefined) {
            return strValue.substring(0, index) + char + strValue.substring(index + 1);
        }
    }
    private insertCharAt(strValue: string, index: number, char: string): string {
        if (strValue !== undefined) {
            return strValue.substring(0, index) + char + strValue.substring(index);
        }
    }
    private getMaskLiterals(mask: string): Map<number, string> {
        const literals = new Map<number, string>();

        for (let i = 0; i < mask.length; i++) {
            const char = mask.charAt(i);
            if (MASK_FLAGS.indexOf(char) === -1) {
                literals.set(i, char);
            }
        }

        return literals;
    }
    private getNonLiteralIndices(mask: string, literalKeys: number[]): number[] {
        const nonLiteralsIndices: number[] = new Array();

        for (let i = 0; i < mask.length; i++) {
            if (literalKeys.indexOf(i) === -1) {
                nonLiteralsIndices.push(i);
            }
        }

        return nonLiteralsIndices;
    }
    private getNonLiteralValues(value: string, literalValues: string[]): string[] {
        const nonLiteralValues: string[] = new Array();

        for (const val of value) {
            if (literalValues.indexOf(val) === -1) {
                nonLiteralValues.push(val);
            }
        }

        return nonLiteralValues;
    }
}
