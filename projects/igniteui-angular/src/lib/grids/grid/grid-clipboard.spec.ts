import { async, fakeAsync, TestBed, tick} from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { BrowserAnimationsModule, NoopAnimationsModule } from '@angular/platform-browser/animations';
import {
    IgxGridModule, IgxGridComponent
} from './index';
import { configureTestSuite } from '../../test-utils/configure-suite';
import { IgxGridClipboardComponent } from '../../test-utils/grid-samples.spec';
import { CancelableEventArgs } from '../../core/utils';
import { take } from 'rxjs/operators';

describe('IgxGrid - Clipboard #grid', () => {
    configureTestSuite();
    let fix;
    let grid: IgxGridComponent;
    beforeAll(async(() => {
        TestBed.configureTestingModule({
            declarations: [
                IgxGridClipboardComponent
            ],
            imports: [BrowserAnimationsModule, IgxGridModule, NoopAnimationsModule]
        })
            .compileComponents();
    }));

    beforeEach(fakeAsync(/** height/width setter rAF */() => {
        fix = TestBed.createComponent(IgxGridClipboardComponent);
        fix.detectChanges();
        grid = fix.componentInstance.grid;
    }));

    it('Copy data with default settings', () => {
        const copySpy = spyOn<any>(grid.onGridCopy, 'emit').and.callThrough();
        const range = { rowStart: 0, rowEnd: 1, columnStart: 1, columnEnd: 3 };
        grid.selectRange(range);
        fix.detectChanges();

        const eventData = dispatchCopyEventOnGridBody(fix);
        expect(copySpy).toHaveBeenCalledTimes(1);
        expect(eventData).
            // tslint:disable-next-line:max-line-length
            toEqual('ProductNameHeader\tDownloads\tReleased\r\n** Ignite UI for JavaScript **\t254\tfalse\r\n** NetAdvantage **\t127\ttrue\r\n');
    });

    it('Copy data when there are no selected cells', () => {
        const copySpy = spyOn<any>(grid.onGridCopy, 'emit').and.callThrough();
        const eventData = dispatchCopyEventOnGridBody(fix);
        expect(copySpy).toHaveBeenCalledTimes(1);
        expect(copySpy).toHaveBeenCalledWith({
            data: [],
            cancel: false
        });
        expect(eventData).toEqual('');
    });

    it('Copy data with different separator', () => {
        const copySpy = spyOn<any>(grid.onGridCopy, 'emit').and.callThrough();
        grid.clipboardOptions.separator = ';';
        grid.selectRange({ rowStart: 0, rowEnd: 0, columnStart: 0, columnEnd: 0 });
        grid.selectRange({ rowStart: 1, rowEnd: 1, columnStart: 1, columnEnd: 1 });
        fix.detectChanges();

        let eventData = dispatchCopyEventOnGridBody(fix);
        expect(copySpy).toHaveBeenCalledTimes(1);
        expect(eventData).toEqual('ID;ProductNameHeader\r\n1;\r\n;** NetAdvantage **\r\n');

        grid.clipboardOptions.separator = ',';
        fix.detectChanges();

        eventData = dispatchCopyEventOnGridBody(fix);
        expect(copySpy).toHaveBeenCalledTimes(2);
        expect(eventData).toEqual('ID,ProductNameHeader\r\n1,\r\n,** NetAdvantage **\r\n');
    });

    it('Copy data without headers', () => {
        const copySpy = spyOn<any>(grid.onGridCopy, 'emit').and.callThrough();
        grid.clipboardOptions.copyHeaders = false;
        grid.selectRange({ rowStart: 1, rowEnd: 2, columnStart: 2, columnEnd: 3 });
        fix.detectChanges();

        let eventData = dispatchCopyEventOnGridBody(fix);
        expect(copySpy).toHaveBeenCalledTimes(1);
        expect(eventData).toEqual('127\ttrue\r\n20\t\r\n');

        grid.clipboardOptions.copyHeaders = true;
        fix.detectChanges();

        eventData = dispatchCopyEventOnGridBody(fix);
        expect(copySpy).toHaveBeenCalledTimes(2);
        expect(eventData).toEqual('Downloads\tReleased\r\n127\ttrue\r\n20\t\r\n');
    });

    it('Disable clipboardOptions', () => {
        const copySpy = spyOn<any>(grid.onGridCopy, 'emit').and.callThrough();
        grid.clipboardOptions.enabled = false;
        grid.selectRange({ rowStart: 0, rowEnd: 2, columnStart: 0, columnEnd: 3 });
        fix.detectChanges();

        const eventData = dispatchCopyEventOnGridBody(fix);
        expect(copySpy).toHaveBeenCalledTimes(0);
        expect(eventData).toEqual('');
    });

    it('Disable copyFormatters', () => {
        const copySpy = spyOn<any>(grid.onGridCopy, 'emit').and.callThrough();
        grid.clipboardOptions.copyFormatters = false;
        grid.selectRange({ rowStart: 1, rowEnd: 3, columnStart: 1, columnEnd: 1 });
        fix.detectChanges();

        let eventData = dispatchCopyEventOnGridBody(fix);
        expect(copySpy).toHaveBeenCalledTimes(1);
        expect(eventData).toEqual('ProductNameHeader\r\nNetAdvantage\r\nIgnite UI for Angular\r\n\r\n');
        grid.clipboardOptions.copyFormatters = true;
        fix.detectChanges();

        eventData = dispatchCopyEventOnGridBody(fix);
        expect(copySpy).toHaveBeenCalledTimes(2);
        expect(eventData).toEqual('ProductNameHeader\r\n** NetAdvantage **\r\n** Ignite UI for Angular **\r\n** null **\r\n');
    });

    it('Cancel onGridCopy event ', () => {
        const copySpy = spyOn<any>(grid.onGridCopy, 'emit').and.callThrough();
        grid.onGridCopy.pipe(take(1)).subscribe((e: CancelableEventArgs) => e.cancel = true);
        grid.selectRange({ rowStart: 1, rowEnd: 3, columnStart: 0, columnEnd: 3 });
        fix.detectChanges();

        const eventData = dispatchCopyEventOnGridBody(fix);
        expect(copySpy).toHaveBeenCalledTimes(1);
        expect(copySpy).toHaveBeenCalledWith({
            data: grid.getSelectedData(true, true),
            cancel: true
        });
        expect(eventData).toEqual('');
    });

    it('Copy when there is a cell in edit mode', fakeAsync(() => {
        const copySpy = spyOn<any>(grid.onGridCopy, 'emit').and.callThrough();
        const cell = grid.getCellByColumn(0, 'ProductName');
        cell.nativeElement.dispatchEvent( new Event('dblclick'));
        tick(16);
        fix.detectChanges();
        expect(cell.editMode).toBe(true);

        grid.selectRange({ rowStart: 1, rowEnd: 3, columnStart: 0, columnEnd: 3 });
        tick(16);
        fix.detectChanges();

        expect(cell.editMode).toBe(true);

        const eventData = dispatchCopyEventOnGridBody(fix);
        expect(copySpy).toHaveBeenCalledTimes(0);
        expect(eventData).toEqual('');
    }));
});

function dispatchCopyEventOnGridBody(fixture) {
    const gridBody = fixture.debugElement.query(By.css('.igx-grid__tbody')).nativeElement;
    const ev = new ClipboardEvent('copy', {clipboardData: new DataTransfer});
    gridBody.dispatchEvent(ev);
    fixture.detectChanges();
    return  ev.clipboardData.getData('text/plain');
}
