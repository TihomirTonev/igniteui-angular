﻿import { async, TestBed } from '@angular/core/testing';
import { IgxGridModule } from './grid.module';
import { IgxGridComponent } from './grid.component';
import { Component, ViewChild } from '@angular/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { IgxColumnLayoutComponent } from '../columns/column-layout.component';
import { SortingDirection } from '../../data-operations/sorting-expression.interface';
import { By } from '@angular/platform-browser';
import { SampleTestData } from '../../test-utils/sample-test-data.spec';
import { wait } from '../../test-utils/ui-interactions.spec';
import { DefaultSortingStrategy } from '../../data-operations/sorting-strategy';
import { configureTestSuite } from '../../test-utils/configure-suite';
import { verifyLayoutHeadersAreAligned, verifyDOMMatchesLayoutSettings } from '../../test-utils/helper-utils.spec';


const GRID_COL_THEAD_TITLE_CLASS = 'igx-grid__th-title';
const GRID_COL_GROUP_THEAD_TITLE_CLASS = 'igx-grid__thead-title';
const GRID_COL_GROUP_THEAD_GROUP_CLASS = 'igx-grid__thead-group';
const GRID_COL_THEAD_CLASS = '.igx-grid__th';
const GRID_MRL_BLOCK = '.igx-grid__mrl-block';

describe('IgxGrid - multi-row-layout #grid', () => {
    configureTestSuite();
    beforeAll(async(() => {
        TestBed.configureTestingModule({
            declarations: [
                ColumnLayoutTestComponent,
                ColumnLayoutAndGroupsTestComponent
            ],
            imports: [
                NoopAnimationsModule,
                IgxGridModule
            ]
        }).compileComponents();
    }));

    function verifyHeadersAreAligned(headerCells, rowCells) {
        for (let i; i < headerCells.length; i++) {
            expect(headerCells[i].headerCell.elementRef.nativeElement.offsetWidth)
                .toBe(rowCells[i].nativeElement.offsetWidth);
            expect(headerCells[i].headerCell.elementRef.nativeElement.offsetHeight)
                .toBe(rowCells[i].nativeElement.offsetHeight);
        }
    }

    function verifyDOMMatchesSettings(row, colSettings) {
        const firstRowCells = row.cells.toArray();
        const rowElem = row.nativeElement;
        const mrlBlocks = rowElem.querySelectorAll(GRID_MRL_BLOCK);

        colSettings.forEach((groupSetting, index) => {
            // check group has rendered block
            const groupBlock = mrlBlocks[index];
            const cellsFromBlock = firstRowCells.filter((cell) => cell.nativeElement.parentNode === groupBlock);
            expect(groupBlock).not.toBeNull();
            groupSetting.columns.forEach((col, colIndex) => {
                const cell = cellsFromBlock[colIndex];
                const cellElem = cell.nativeElement;
                // check correct attributes are applied
                expect(parseInt(cellElem.style['gridRowStart'], 10)).toBe(parseInt(col.rowStart, 10));
                expect(parseInt(cellElem.style['gridColumnStart'], 10)).toBe(parseInt(col.colStart, 10));
                expect(cellElem.style['gridColumnEnd']).toBe(col.colEnd ? col.colEnd.toString() : '');
                expect(cellElem.style['gridRowEnd']).toBe(col.rowEnd ? col.rowEnd.toString() : '');

                // check width
                let sum = 0;
                if (cell.gridColumnSpan > 1) {
                    for (let i = col.colStart; i < col.colStart + cell.column.gridColumnSpan; i++) {
                        const colData = groupSetting.columns.find((currCol) => currCol.colStart === i && currCol.field !== col.field);
                        const col2 = row.grid.getColumnByName(colData ? colData.field : '');
                        sum += col2 ? parseFloat(col2.calcWidth) : 0;
                    }
                }
                const expectedWidth = Math.max(parseFloat(cell.column.calcWidth) * cell.column.gridColumnSpan, sum);
                expect(cellElem.clientWidth - expectedWidth).toBeLessThan(1);
                // check height
                const expectedHeight = cell.grid.rowHeight * cell.gridRowSpan;
                expect(cellElem.offsetHeight).toBe(expectedHeight);

                // check offset left
                const acc = (accum, c) => {
                    if (c.column.colStart < col.colStart && c.column.rowStart === col.rowStart) {
                        return accum += parseFloat(c.column.calcWidth) * c.column.gridColumnSpan;
                    } else {
                        return accum;
                    }
                };
                const expectedLeft = cellsFromBlock.reduce(acc, 0);
                expect(cellElem.offsetLeft - groupBlock.offsetLeft - expectedLeft).toBeLessThan(1);
                // check offsetTop
                const expectedTop = (col.rowStart - 1) * cell.grid.rowHeight;
                expect(cellElem.offsetTop).toBe(expectedTop);
            });
        });
    }

    it('should initialize a grid with 1 column group', () => {
        const fixture = TestBed.createComponent(ColumnLayoutTestComponent);
        fixture.detectChanges();
        const grid = fixture.componentInstance.grid;
        const gridFirstRow = grid.rowList.first;
        const firstRowCells = gridFirstRow.cells.toArray();
        const headerCells = grid.headerGroups.first.children.toArray();

        // headers are aligned to cells
        verifyLayoutHeadersAreAligned(headerCells, firstRowCells);

        verifyDOMMatchesLayoutSettings(gridFirstRow, fixture.componentInstance.colGroups);

        // the last cell is spaned as much as the first 3 cells
        const firstThreeCellsWidth = firstRowCells[0].nativeElement.offsetWidth +
             firstRowCells[1].nativeElement.offsetWidth +
             firstRowCells[2].nativeElement.offsetWidth;
        const lastCellWidth = firstRowCells[3].nativeElement.offsetWidth;
        expect(2 * firstRowCells[0].nativeElement.offsetHeight).toEqual(firstRowCells[3].nativeElement.offsetHeight);
        expect(firstThreeCellsWidth).toEqual(lastCellWidth);
    });

    it('should initialize grid with 2 column groups', () => {
        const fixture = TestBed.createComponent(ColumnLayoutTestComponent);
        fixture.detectChanges();
        fixture.componentInstance.colGroups.push({
            group: 'group2',
            columns: [
                { field: 'ContactName', rowStart: 2, colStart: 1, colEnd: 4, rowEnd: 4 },
                { field: 'CompanyName', rowStart: 1, colStart: 1 },
                { field: 'PostalCode', rowStart: 1, colStart: 2 },
                { field: 'Fax', rowStart: 1, colStart: 3 }
            ]
        });
        fixture.detectChanges();
        const grid = fixture.componentInstance.grid;
        const gridFirstRow = grid.rowList.first;
        const firstRowCells = gridFirstRow.cells.toArray();
        const headerCells = grid.headerGroups.first.children.toArray();

         // headers are aligned to cells
         verifyLayoutHeadersAreAligned(headerCells, firstRowCells);

         verifyDOMMatchesLayoutSettings(gridFirstRow, fixture.componentInstance.colGroups);
    });

    it('should not throw error when layout is incomplete and should render valid mrl block styles', () => {
        const fixture = TestBed.createComponent(ColumnLayoutTestComponent);
        fixture.detectChanges();
        // creating an incomplete layout
        fixture.componentInstance.colGroups = [{
            group: 'group1',
            columns: [
                { field: 'ContactName', rowStart: 2, colStart: 1, colEnd: 4, rowEnd: 3 },
                { field: 'CompanyName', rowStart: 1, colStart: 1 },
                { field: 'PostalCode', rowStart: 1, colStart: 2 },
                // { field: 'Fax', rowStart: 1, colStart: 3},
                { field: 'Country', rowStart: 3, colStart: 1 },
                // { field: 'Region', rowStart: 3, colStart: 2},
                { field: 'Phone', rowStart: 3, colStart: 3 }
            ]
        }];
        fixture.componentInstance.grid.width = '617px';
        fixture.detectChanges();
        const grid = fixture.componentInstance.grid;
        const gridFirstRow = grid.rowList.first;
        const firstRowCells = gridFirstRow.cells.toArray();
        const headerCells = grid.headerGroups.first.children.toArray();
        // headers are aligned to cells
        verifyLayoutHeadersAreAligned(headerCells, firstRowCells);

        // verify block style
        expect(grid.columnList.first.getGridTemplate(false, false)).toBe('200px 200px 200px');
        expect(grid.columnList.first.getGridTemplate(true, false)).toBe('repeat(3,1fr)');

        // creating an incomplete layout 2
        fixture.componentInstance.colGroups = [{
            group: 'group1',
            columns: [
                { field: 'ContactName', rowStart: 1, colStart: 1, colEnd: 4, rowEnd: 3 },
                { field: 'CompanyName', rowStart: 3, colStart: 1 },
                // { field: 'PostalCode', rowStart: 1, colStart: 2},
                { field: 'Fax', rowStart: 3, colStart: 3 }
            ]
        }];
        fixture.componentInstance.grid.width = '617px';
        fixture.detectChanges();

        expect(grid.columnList.first.getGridTemplate(false, false)).toBe('200px 200px 200px');
        expect(grid.columnList.first.getGridTemplate(true, false)).toBe('repeat(3,1fr)');

    });
    it('should initialize correctly when no column widths are set.', () => {
        // test with single group
        const fixture = TestBed.createComponent(ColumnLayoutTestComponent);
        fixture.detectChanges();
        fixture.componentInstance.grid.width = '617px';
        fixture.detectChanges();
        const grid = fixture.componentInstance.grid;
        // col span is 3 => columns should have grid width - scrollbarWitdh/3 width
        // check columns
        expect(grid.getCellByColumn(0, 'ID').nativeElement.offsetWidth).toBe(200);
        expect(grid.getCellByColumn(0, 'CompanyName').nativeElement.offsetWidth).toBe(200);
        expect(grid.getCellByColumn(0, 'ContactName').nativeElement.offsetWidth).toBe(200);
        expect(grid.getCellByColumn(0, 'ContactTitle').nativeElement.offsetWidth).toBe(200 * 3);

        // check group blocks
        let groupHeaderBlocks = fixture.debugElement.query(By.css('.igx-grid__thead')).queryAll(By.css(GRID_MRL_BLOCK));
        expect(groupHeaderBlocks[0].nativeElement.clientWidth).toBe(200 * 3);
        expect(groupHeaderBlocks[0].nativeElement.clientHeight).toBe(51 * 3);

        let firstRowCells = grid.rowList.first.cells.toArray();
        let headerCells = grid.headerGroups.first.children.toArray();
        verifyLayoutHeadersAreAligned(headerCells, firstRowCells);

        verifyDOMMatchesLayoutSettings(grid.rowList.first, fixture.componentInstance.colGroups);

        // test with 2 groups
        fixture.componentInstance.colGroups.push({
            group: 'group2',
            columns: [
                { field: 'Country', rowStart: 1, colStart: 1, colEnd: 4, rowEnd: 3 },
                { field: 'Region', rowStart: 3, colStart: 1 },
                { field: 'PostalCode', rowStart: 3, colStart: 2 },
                { field: 'Fax', rowStart: 3, colStart: 3 }
            ]
        });
        fixture.componentInstance.grid.width = '917px';
        fixture.detectChanges();

        // col span is 6 => columns should have grid width - scrollbarWitdh/6 width
        expect(grid.getCellByColumn(0, 'ID').nativeElement.offsetWidth).toBe(150);
        expect(grid.getCellByColumn(0, 'CompanyName').nativeElement.offsetWidth).toBe(150);
        expect(grid.getCellByColumn(0, 'ContactName').nativeElement.offsetWidth).toBe(150);
        expect(grid.getCellByColumn(0, 'ContactTitle').nativeElement.offsetWidth).toBe(150 * 3);

        expect(grid.getCellByColumn(0, 'Fax').nativeElement.offsetWidth).toBe(150);
        expect(grid.getCellByColumn(0, 'Region').nativeElement.offsetWidth).toBe(150);
        expect(grid.getCellByColumn(0, 'PostalCode').nativeElement.offsetWidth).toBe(150);
        expect(grid.getCellByColumn(0, 'Country').nativeElement.offsetWidth).toBe(150 * 3);

        // check group blocks
        groupHeaderBlocks = fixture.debugElement.query(By.css('.igx-grid__thead')).queryAll(By.css(GRID_MRL_BLOCK));
        expect(groupHeaderBlocks[0].nativeElement.clientWidth).toBe(150 * 3);
        expect(groupHeaderBlocks[0].nativeElement.clientHeight).toBe(51 * 3);
        expect(groupHeaderBlocks[1].nativeElement.clientWidth).toBe(150 * 3);
        expect(groupHeaderBlocks[1].nativeElement.clientHeight).toBe(51 * 3);

        firstRowCells = grid.rowList.first.cells.toArray();
        headerCells = grid.headerGroups.first.children.toArray();

        verifyLayoutHeadersAreAligned(headerCells, firstRowCells);
        verifyDOMMatchesLayoutSettings(grid.rowList.first, fixture.componentInstance.colGroups);

        // test with 3 groups
        fixture.componentInstance.colGroups.push({
            group: 'group3',
            columns: [
                { field: 'Phone', rowStart: 1, colStart: 1, colEnd: 3, rowEnd: 4 }
            ]
        });
        fixture.detectChanges();

        // col span is 8 => min-width exceeded should use 136px
        expect(grid.getCellByColumn(0, 'ID').nativeElement.offsetWidth).toBe(136);
        expect(grid.getCellByColumn(0, 'CompanyName').nativeElement.offsetWidth).toBe(136);
        expect(grid.getCellByColumn(0, 'ContactName').nativeElement.offsetWidth).toBe(136);
        expect(grid.getCellByColumn(0, 'ContactTitle').nativeElement.offsetWidth).toBe(136 * 3);

        expect(grid.getCellByColumn(0, 'Fax').nativeElement.offsetWidth).toBe(136);
        expect(grid.getCellByColumn(0, 'Region').nativeElement.offsetWidth).toBe(136);
        expect(grid.getCellByColumn(0, 'PostalCode').nativeElement.offsetWidth).toBe(136);
        expect(grid.getCellByColumn(0, 'Country').nativeElement.offsetWidth).toBe(136 * 3);

        expect(grid.getCellByColumn(0, 'Phone').nativeElement.offsetWidth).toBe(136 * 2);

        // check group blocks
        groupHeaderBlocks = fixture.debugElement.query(By.css('.igx-grid__thead')).queryAll(By.css(GRID_MRL_BLOCK));
        expect(groupHeaderBlocks[0].nativeElement.clientWidth).toBe(136 * 3);
        expect(groupHeaderBlocks[0].nativeElement.clientHeight).toBe(51 * 3);
        expect(groupHeaderBlocks[1].nativeElement.clientWidth).toBe(136 * 3);
        expect(groupHeaderBlocks[1].nativeElement.clientHeight).toBe(51 * 3);
        expect(groupHeaderBlocks[2].nativeElement.clientWidth).toBe(136 * 2);
        // the following throws error because last colgroup row span in header does not fill content
        // expect(groupHeaderBlocks[2].nativeElement.clientHeight).toBe(50 * 3);

        verifyLayoutHeadersAreAligned(headerCells, firstRowCells);
        verifyDOMMatchesLayoutSettings(grid.rowList.first, fixture.componentInstance.colGroups);
    });
    it('should initialize correctly when widths are set in px.', () => {
        // test with single group - all cols with colspan 1 have width
        const fixture = TestBed.createComponent(ColumnLayoutTestComponent);
        fixture.detectChanges();
        fixture.componentInstance.colGroups = [{
            group: 'group1',
            columns: [
                { field: 'ID', rowStart: 1, colStart: 1, width: '100px' },
                { field: 'CompanyName', rowStart: 1, colStart: 2, width: '200px' },
                { field: 'ContactName', rowStart: 1, colStart: 3, width: '300px' },
                { field: 'ContactTitle', rowStart: 2, colStart: 1, rowEnd: 4, colEnd: 4 },
            ]
        }];
        fixture.detectChanges();
        fixture.detectChanges();
        const grid = fixture.componentInstance.grid;
        // check columns
        expect(grid.getCellByColumn(0, 'ID').nativeElement.offsetWidth).toBe(100);
        expect(grid.getCellByColumn(0, 'CompanyName').nativeElement.offsetWidth).toBe(200);
        expect(grid.getCellByColumn(0, 'ContactName').nativeElement.offsetWidth).toBe(300);
        expect(grid.getCellByColumn(0, 'ContactTitle').nativeElement.offsetWidth).toBe(600);

        // check group blocks
        let groupHeaderBlocks = fixture.debugElement.query(By.css('.igx-grid__thead')).queryAll(By.css(GRID_MRL_BLOCK));
        expect(groupHeaderBlocks[0].nativeElement.clientWidth).toBe(600);

        let firstRowCells = grid.rowList.first.cells.toArray();
        let headerCells = grid.headerGroups.first.children.toArray();
        verifyLayoutHeadersAreAligned(headerCells, firstRowCells);
        verifyDOMMatchesLayoutSettings(grid.rowList.first, fixture.componentInstance.colGroups);


        // test with 2 groups - only 2 columns with colspan1 have width
        fixture.componentInstance.colGroups.push({
            group: 'group2',
            columns: [
                { field: 'Country', rowStart: 1, colStart: 1, colEnd: 4, rowEnd: 3 },
                { field: 'Region', rowStart: 3, colStart: 1, width: '100px' },
                { field: 'PostalCode', rowStart: 3, colStart: 2 },
                { field: 'Fax', rowStart: 3, colStart: 3, width: '200px' }
            ]
        });
        fixture.componentInstance.grid.width = '1117px';
        fixture.detectChanges();
        fixture.detectChanges();

        // first group takes 600px, 500px left for second group
        // check columns
        expect(grid.getCellByColumn(0, 'ID').nativeElement.offsetWidth).toBe(100);
        expect(grid.getCellByColumn(0, 'CompanyName').nativeElement.offsetWidth).toBe(200);
        expect(grid.getCellByColumn(0, 'ContactName').nativeElement.offsetWidth).toBe(300);
        expect(grid.getCellByColumn(0, 'ContactTitle').nativeElement.offsetWidth).toBe(600);

        // This fails for unknown reasons only in travis with 2px difference
        //  expect(grid.getCellByColumn(0, 'Country').nativeElement.offsetWidth).toBe(500);
        //  expect(grid.getCellByColumn(0, 'Region').nativeElement.offsetWidth).toBe(100);
        //  // postal code has no width - auto width should be assigned based on available space.
        //  expect(grid.getCellByColumn(0, 'PostalCode').nativeElement.offsetWidth).toBe(200);
        //  expect(grid.getCellByColumn(0, 'Fax').nativeElement.offsetWidth).toBe(200);

        //  // check group blocks
        //  groupHeaderBlocks = fixture.debugElement.query(By.css('.igx-grid__thead')).queryAll(By.css(GRID_MRL_BLOCK));
        //  expect(groupHeaderBlocks[1].nativeElement.clientWidth).toBe(500);

         firstRowCells = grid.rowList.first.cells.toArray();
         headerCells = grid.headerGroups.first.children.toArray();
         verifyLayoutHeadersAreAligned(headerCells, firstRowCells);
         verifyDOMMatchesLayoutSettings(grid.rowList.first, fixture.componentInstance.colGroups);

        // test with 3 groups - only parent has width
        fixture.componentInstance.colGroups.push({
            group: 'group3',
            columns: [
                { field: 'Phone', rowStart: 1, colStart: 1, colEnd: 3, width: '500px' },
                { field: 'Phone1', rowStart: 2, colStart: 1, colEnd: 2, rowSpan: 'span 2' },
                { field: 'Phone2', rowStart: 2, colStart: 2, colEnd: 3, rowSpan: 'span 2' }
            ]
        });
        fixture.componentInstance.grid.width = '1617px';
        fixture.detectChanges();
        fixture.detectChanges();

        // check columns
        expect(grid.getCellByColumn(0, 'Phone').nativeElement.offsetWidth).toBe(500);
        expect(grid.getCellByColumn(0, 'Phone1').nativeElement.offsetWidth).toBe(250);
        expect(grid.getCellByColumn(0, 'Phone2').nativeElement.offsetWidth).toBe(250);

        groupHeaderBlocks = fixture.debugElement.query(By.css('.igx-grid__thead')).queryAll(By.css(GRID_MRL_BLOCK));
        expect(groupHeaderBlocks[2].nativeElement.clientWidth).toBe(500);

        firstRowCells = grid.rowList.first.cells.toArray();
        headerCells = grid.headerGroups.first.children.toArray();
        verifyLayoutHeadersAreAligned(headerCells, firstRowCells);
    });

    it('should correctly autofit column without width when there are other set with width in pixels', () => {
        // In this case it would be for City column and 3rd template column.
        const fixture = TestBed.createComponent(ColumnLayoutTestComponent);
        fixture.detectChanges();
        // creating an incomplete layout
        fixture.componentInstance.grid.width = '1200px';
        fixture.componentInstance.colGroups = [{
            group: 'group1',
            columns: [
                { field: 'ContactName', rowStart: 1, colStart: 1, colEnd : 4},
                { field: 'ContactTitle', rowStart: 1, colStart: 4, colEnd: 6, width: '200px'},
                { field: 'Country', rowStart: 1, colStart: 6, colEnd: 7, width: '200px'},
                { field: 'Phone', rowStart: 2, colStart: 1, colEnd: 3, width: '200px'},
                { field: 'City', rowStart: 2, colStart: 3, colEnd: 5},
                { field: 'Address', rowStart: 2, colStart: 5, colEnd: 7, width: '200px'},
                { field: 'CompanyName', rowStart: 3, colStart: 1, colEnd: 2, width: '200px'},
                { field: 'PostalCode', rowStart: 3, colStart: 2, colEnd: 3, width: '200px'},
                { field: 'Fax', rowStart: 3, colStart: 3, colEnd: 7},
            ]
        }];
        fixture.detectChanges();
        const grid = fixture.componentInstance.grid;
        const gridFirstRow = grid.rowList.first;
        const firstRowCells = gridFirstRow.cells.toArray();
        const headerCells = grid.headerGroups.first.children.toArray();

        // headers are aligned to cells
        verifyLayoutHeadersAreAligned(headerCells, firstRowCells);

        const autoSizedColumnWidth = 400 - grid.scrollWidth;
        const groupRowBlocks = fixture.debugElement.query(By.css('.igx-grid__tbody')).queryAll(By.css('.igx-grid__mrl-block'));
        expect(groupRowBlocks[0].nativeElement.style.gridTemplateColumns)
            .toEqual('200px 200px ' + autoSizedColumnWidth + 'px 100px 100px 200px');
    });

    it('should correctly size column without width when it overlaps partially with bigger column that has width above it', () => {
        // In this case it would be for City column and 3rd template column overlapping width ContactName.
        const fixture = TestBed.createComponent(ColumnLayoutTestComponent);
        // creating an incomplete layout
        fixture.componentInstance.grid.width = '1200px';
        fixture.componentInstance.colGroups = [{
            group: 'group1',
            columns: [
                { field: 'ContactName', rowStart: 1, colStart: 1, colEnd : 4, width: '300px'},
                { field: 'ContactTitle', rowStart: 1, colStart: 4, colEnd: 6, width: '200px'},
                { field: 'Country', rowStart: 1, colStart: 6, colEnd: 7, width: '200px'},
                { field: 'Phone', rowStart: 2, colStart: 1, colEnd: 3, width: '200px'},
                { field: 'City', rowStart: 2, colStart: 3, colEnd: 5},
                { field: 'Address', rowStart: 2, colStart: 5, colEnd: 7, width: '200px'},
                { field: 'CompanyName', rowStart: 3, colStart: 1, colEnd: 2, width: '200px'},
                { field: 'PostalCode', rowStart: 3, colStart: 2, colEnd: 3, width: '200px'},
                { field: 'Fax', rowStart: 3, colStart: 3, colEnd: 7},
            ]
        }];
        fixture.detectChanges();
        const grid = fixture.componentInstance.grid;
        const gridFirstRow = grid.rowList.first;
        const firstRowCells = gridFirstRow.cells.toArray();
        const headerCells = grid.headerGroups.first.children.toArray();

        // headers are aligned to cells
        verifyLayoutHeadersAreAligned(headerCells, firstRowCells);

        const groupRowBlocks = fixture.debugElement.query(By.css('.igx-grid__tbody')).queryAll(By.css('.igx-grid__mrl-block'));
        expect(groupRowBlocks[0].nativeElement.style.gridTemplateColumns).toEqual('200px 200px 100px 100px 100px 200px');
    });

    it('should correctly size column without width when it overlaps partially with bigger column that has width bellow it', () => {
        // In this case it would be for City column and 3rd template column overlapping width ContactName.
        const fixture = TestBed.createComponent(ColumnLayoutTestComponent);
        // creating an incomplete layout
        fixture.componentInstance.grid.width = '1200px';
        fixture.componentInstance.colGroups = [{
            group: 'group1',
            columns: [
                { field: 'ContactName', rowStart: 1, colStart: 1, colEnd : 5, width: '200px'},
                { field: 'ContactTitle', rowStart: 1, colStart: 5, colEnd: 6, width: '200px'},
                { field: 'Country', rowStart: 1, colStart: 6, colEnd: 7},
                { field: 'Phone', rowStart: 2, colStart: 1, colEnd: 3, width: '200px'},
                { field: 'City', rowStart: 2, colStart: 3, colEnd: 5, width: '200px'},
                { field: 'Address', rowStart: 2, colStart: 5, colEnd: 7, width: '300px'},
                { field: 'CompanyName', rowStart: 3, colStart: 1, colEnd: 2, width: '200px'},
                { field: 'PostalCode', rowStart: 3, colStart: 2, colEnd: 3, width: '200px'},
                { field: 'Fax', rowStart: 3, colStart: 3, colEnd: 7, width: '200px'},
            ]
        }];
        fixture.detectChanges();
        const grid = fixture.componentInstance.grid;
        const gridFirstRow = grid.rowList.first;
        const firstRowCells = gridFirstRow.cells.toArray();
        const headerCells = grid.headerGroups.first.children.toArray();

        // headers are aligned to cells
        verifyLayoutHeadersAreAligned(headerCells, firstRowCells);

        const groupRowBlocks = fixture.debugElement.query(By.css('.igx-grid__tbody')).queryAll(By.css('.igx-grid__mrl-block'));
        expect(groupRowBlocks[0].nativeElement.style.gridTemplateColumns).toEqual('200px 200px 100px 100px 200px 150px');
    });

    it('should correctly set column width when there is bigger column at the bottom where there is not width yet', () => {
        // In this case it would be for City column and 3rd template column.
        const fixture = TestBed.createComponent(ColumnLayoutTestComponent);
        // creating an incomplete layout
        fixture.componentInstance.grid.width = '1200px';
        fixture.componentInstance.colGroups = [{
            group: 'group1',
            columns: [
                { field: 'ContactName', rowStart: 1, colStart: 1, colEnd : 4},
                { field: 'ContactTitle', rowStart: 1, colStart: 4, colEnd: 6, width: '200px'},
                { field: 'Country', rowStart: 1, colStart: 6, colEnd: 7, width: '200px'},
                { field: 'Phone', rowStart: 2, colStart: 1, colEnd: 3, width: '200px'},
                { field: 'City', rowStart: 2, colStart: 3, colEnd: 5},
                { field: 'Address', rowStart: 2, colStart: 5, colEnd: 7, width: '200px'},
                { field: 'CompanyName', rowStart: 3, colStart: 1, colEnd: 2, width: '200px'},
                { field: 'PostalCode', rowStart: 3, colStart: 2, colEnd: 3, width: '200px'},
                { field: 'Fax', rowStart: 3, colStart: 3, colEnd: 7, width: '400px'},
            ]
        }];
        fixture.detectChanges();
        const grid = fixture.componentInstance.grid;
        const gridFirstRow = grid.rowList.first;
        const firstRowCells = gridFirstRow.cells.toArray();
        const headerCells = grid.headerGroups.first.children.toArray();

        // headers are aligned to cells
        verifyLayoutHeadersAreAligned(headerCells, firstRowCells);

        const groupRowBlocks = fixture.debugElement.query(By.css('.igx-grid__tbody')).queryAll(By.css('.igx-grid__mrl-block'));
        expect(groupRowBlocks[0].nativeElement.style.gridTemplateColumns).toEqual('200px 200px 100px 100px 100px 200px');
    });

    it('should correctly set column width of column without width when there are two bigger columns that overlap with it', () => {
        // In this case it would be for City column and 3rd template column overlapping with ContactName and Fax.
        const fixture = TestBed.createComponent(ColumnLayoutTestComponent);
        // creating an incomplete layout
        fixture.componentInstance.grid.width = '1200px';
        fixture.componentInstance.colGroups = [{
            group: 'group1',
            columns: [
                { field: 'ContactName', rowStart: 1, colStart: 1, colEnd : 4, width: '360px'},
                { field: 'ContactTitle', rowStart: 1, colStart: 4, colEnd: 6, width: '200px'},
                { field: 'Country', rowStart: 1, colStart: 6, colEnd: 7, width: '200px'},
                { field: 'Phone', rowStart: 2, colStart: 1, colEnd: 3, width: '200px'},
                { field: 'City', rowStart: 2, colStart: 3, colEnd: 5},
                { field: 'Address', rowStart: 2, colStart: 5, colEnd: 7, width: '200px'},
                { field: 'CompanyName', rowStart: 3, colStart: 1, colEnd: 2, width: '200px'},
                { field: 'PostalCode', rowStart: 3, colStart: 2, colEnd: 3, width: '200px'},
                { field: 'Fax', rowStart: 3, colStart: 3, colEnd: 7, width: '400px'},
            ]
        }];
        fixture.detectChanges();
        const grid = fixture.componentInstance.grid;
        const gridFirstRow = grid.rowList.first;
        const firstRowCells = gridFirstRow.cells.toArray();
        const headerCells = grid.headerGroups.first.children.toArray();

        // headers are aligned to cells
        verifyLayoutHeadersAreAligned(headerCells, firstRowCells);

        const groupRowBlocks = fixture.debugElement.query(By.css('.igx-grid__tbody')).queryAll(By.css('.igx-grid__mrl-block'));
        expect(groupRowBlocks[0].nativeElement.style.gridTemplateColumns).toEqual('200px 200px 120px 100px 100px 200px');
    });

    it('should correctly autofit column without width when grid width is not enough and other cols are set in pixels', () => {
        // In this case it would be for City column and 3rd template column.
        const fixture = TestBed.createComponent(ColumnLayoutTestComponent);
        // creating an incomplete layout
        fixture.componentInstance.grid.width = '700px';
        fixture.componentInstance.colGroups = [{
            group: 'group1',
            columns: [
                { field: 'ContactName', rowStart: 1, colStart: 1, colEnd : 4},
                { field: 'ContactTitle', rowStart: 1, colStart: 4, colEnd: 6, width: '200px'},
                { field: 'Country', rowStart: 1, colStart: 6, colEnd: 7, width: '200px'},
                { field: 'Phone', rowStart: 2, colStart: 1, colEnd: 3, width: '200px'},
                { field: 'City', rowStart: 2, colStart: 3, colEnd: 5},
                { field: 'Address', rowStart: 2, colStart: 5, colEnd: 7, width: '200px'},
                { field: 'CompanyName', rowStart: 3, colStart: 1, colEnd: 2, width: '200px'},
                { field: 'PostalCode', rowStart: 3, colStart: 2, colEnd: 3, width: '200px'},
                { field: 'Fax', rowStart: 3, colStart: 3, colEnd: 7},
            ]
        }];
        fixture.detectChanges();
        const grid = fixture.componentInstance.grid;
        const gridFirstRow = grid.rowList.first;
        const firstRowCells = gridFirstRow.cells.toArray();
        const headerCells = grid.headerGroups.first.children.toArray();

        // headers are aligned to cells
        verifyLayoutHeadersAreAligned(headerCells, firstRowCells);

        const groupRowBlocks = fixture.debugElement.query(By.css('.igx-grid__tbody')).queryAll(By.css('.igx-grid__mrl-block'));
        expect(groupRowBlocks[0].nativeElement.style.gridTemplateColumns).toEqual('200px 200px 136px 100px 100px 200px');
    });

    it('should autofit a column with span 1 that does not have width set and is under a col with span 2 with width set', () => {
        // In this case it would be for Phone, CompanyName  and PostalCode columns and first 2 template columns.
        const fixture = TestBed.createComponent(ColumnLayoutTestComponent);
        // creating an incomplete layout
        fixture.componentInstance.grid.width = '700px';
        fixture.componentInstance.colGroups = [{
            group: 'group1',
            columns: [
                { field: 'ContactName', rowStart: 1, colStart: 1, colEnd : 4},
                { field: 'ContactTitle', rowStart: 1, colStart: 4, colEnd: 6, width: '200px'},
                { field: 'Country', rowStart: 1, colStart: 6, colEnd: 7, width: '200px'},
                { field: 'Phone', rowStart: 2, colStart: 1, colEnd: 3},
                { field: 'City', rowStart: 2, colStart: 3, colEnd: 5},
                { field: 'Address', rowStart: 2, colStart: 5, colEnd: 7, width: '200px'},
                { field: 'CompanyName', rowStart: 3, colStart: 1, colEnd: 2, width: '200px'},
                { field: 'PostalCode', rowStart: 3, colStart: 2, colEnd: 3},
                { field: 'Fax', rowStart: 3, colStart: 3, colEnd: 7},
            ]
        }];
        fixture.detectChanges();
        const grid = fixture.componentInstance.grid;
        const gridFirstRow = grid.rowList.first;
        const firstRowCells = gridFirstRow.cells.toArray();
        const headerCells = grid.headerGroups.first.children.toArray();

        // headers are aligned to cells
        verifyLayoutHeadersAreAligned(headerCells, firstRowCells);

        const groupRowBlocks = fixture.debugElement.query(By.css('.igx-grid__tbody')).queryAll(By.css('.igx-grid__mrl-block'));
        expect(groupRowBlocks[0].nativeElement.style.gridTemplateColumns).toEqual('200px 136px 136px 100px 100px 200px');
    });

    it('should use column width of a column with span 2 that has width when there are no columns with span 1 to take width from', () => {
        // In this case it would be for Phone, CompanyName  and PostalCode columns and first 2 template columns.
        const fixture = TestBed.createComponent(ColumnLayoutTestComponent);
        // creating an incomplete layout
        fixture.componentInstance.grid.width = '700px';
        fixture.componentInstance.colGroups = [{
            group: 'group1',
            columns: [
                { field: 'ContactName', rowStart: 1, colStart: 1, colEnd : 4},
                { field: 'ContactTitle', rowStart: 1, colStart: 4, colEnd: 6, width: '200px'},
                { field: 'Country', rowStart: 1, colStart: 6, colEnd: 7, width: '200px'},
                { field: 'Phone', rowStart: 2, colStart: 1, colEnd: 3, width: '200px'},
                { field: 'City', rowStart: 2, colStart: 3, colEnd: 5},
                { field: 'Address', rowStart: 2, colStart: 5, colEnd: 7, width: '200px'},
                { field: 'CompanyName', rowStart: 3, colStart: 1, colEnd: 2},
                { field: 'PostalCode', rowStart: 3, colStart: 2, colEnd: 3},
                { field: 'Fax', rowStart: 3, colStart: 3, colEnd: 7},
            ]
        }];
        fixture.detectChanges();
        const grid = fixture.componentInstance.grid;
        const gridFirstRow = grid.rowList.first;
        const firstRowCells = gridFirstRow.cells.toArray();
        const headerCells = grid.headerGroups.first.children.toArray();

        // headers are aligned to cells
        verifyLayoutHeadersAreAligned(headerCells, firstRowCells);

        const groupRowBlocks = fixture.debugElement.query(By.css('.igx-grid__tbody')).queryAll(By.css('.igx-grid__mrl-block'));
        expect(groupRowBlocks[0].nativeElement.style.gridTemplateColumns).toEqual('100px 100px 136px 100px 100px 200px');
    });

    it('should use divided column width when there is stairway type of defined columns and they have widths set', () => {
        // In this case it would be for Country and Address columns  and last 3 template columns.
        const fixture = TestBed.createComponent(ColumnLayoutTestComponent);
        // creating an incomplete layout
        fixture.componentInstance.grid.width = '700px';
        fixture.componentInstance.colGroups = [{
            group: 'group1',
            columns: [
                { field: 'ContactName', rowStart: 1, colStart: 1, colEnd : 4},
                { field: 'ContactTitle', rowStart: 1, colStart: 4, colEnd: 6, width: '200px'},
                { field: 'Country', rowStart: 1, colStart: 6, colEnd: 8, width: '200px'},
                { field: 'Phone', rowStart: 2, colStart: 1, colEnd: 3, width: '200px'},
                { field: 'City', rowStart: 2, colStart: 3, colEnd: 5},
                { field: 'Address', rowStart: 2, colStart: 5, colEnd: 8, width: '150px'},
                { field: 'CompanyName', rowStart: 3, colStart: 1, colEnd: 2},
                { field: 'PostalCode', rowStart: 3, colStart: 2, colEnd: 3},
                { field: 'Fax', rowStart: 3, colStart: 3, colEnd: 8},
            ]
        }];
        fixture.detectChanges();
        const grid = fixture.componentInstance.grid;
        const gridFirstRow = grid.rowList.first;
        const firstRowCells = gridFirstRow.cells.toArray();
        const headerCells = grid.headerGroups.first.children.toArray();

        // headers are aligned to cells
        verifyLayoutHeadersAreAligned(headerCells, firstRowCells);

        const groupRowBlocks = fixture.debugElement.query(By.css('.igx-grid__tbody')).queryAll(By.css('.igx-grid__mrl-block'));
        expect(groupRowBlocks[0].nativeElement.style.gridTemplateColumns).toEqual('100px 100px 136px 100px 100px 100px 100px');
    });

    it('should initialize correctly when widths are set in %.', () => {
        const fixture = TestBed.createComponent(ColumnLayoutTestComponent);
        fixture.detectChanges();

        const grid = fixture.componentInstance.grid;
        fixture.componentInstance.colGroups = [{
            group: 'group1',
            columns: [
                { field: 'ID', rowStart: 1, colStart: 1, width: '10%' },
                { field: 'CompanyName', rowStart: 1, colStart: 2, width: '20%' },
                { field: 'ContactName', rowStart: 1, colStart: 3, width: '30%' },
                { field: 'ContactTitle', rowStart: 2, colStart: 1, rowEnd: 4, colEnd: 4 },
            ]
        }];
        fixture.detectChanges();
        fixture.componentInstance.grid.width = (1000 + grid.scrollWidth) + 'px';
        fixture.detectChanges();

        // check columns
        expect(grid.getCellByColumn(0, 'ID').nativeElement.offsetWidth).toBe(100);
        expect(grid.getCellByColumn(0, 'CompanyName').nativeElement.offsetWidth).toBe(200);
        expect(grid.getCellByColumn(0, 'ContactName').nativeElement.offsetWidth).toBe(300);
        expect(grid.getCellByColumn(0, 'ContactTitle').nativeElement.offsetWidth).toBe(600);

        // check group blocks
        let groupHeaderBlocks = fixture.debugElement.query(By.css('.igx-grid__thead')).queryAll(By.css(GRID_MRL_BLOCK));
        expect(groupHeaderBlocks[0].nativeElement.clientWidth).toBe(600);

        let firstRowCells = grid.rowList.first.cells.toArray();
        let headerCells = grid.headerGroups.first.children.toArray();
        verifyLayoutHeadersAreAligned(headerCells, firstRowCells);
        verifyDOMMatchesLayoutSettings(grid.rowList.first, fixture.componentInstance.colGroups);

        fixture.componentInstance.colGroups.push({
            group: 'group2',
            columns: [
                { field: 'Country', rowStart: 1, colStart: 1, colEnd: 4, rowEnd: 3 },
                { field: 'Region', rowStart: 3, colStart: 1, width: '10%' },
                { field: 'PostalCode', rowStart: 3, colStart: 2 },
                { field: 'Fax', rowStart: 3, colStart: 3, width: '20%' }
            ]
        });
        fixture.detectChanges();
        fixture.detectChanges();

        // check columns
        expect(grid.getCellByColumn(0, 'Country').nativeElement.offsetWidth).toBe(100 + 200 + 136);
        expect(grid.getCellByColumn(0, 'Region').nativeElement.offsetWidth).toBe(100);
        expect(grid.getCellByColumn(0, 'PostalCode').nativeElement.offsetWidth).toBe(136);
        expect(grid.getCellByColumn(0, 'Fax').nativeElement.offsetWidth).toBe(200);

        // check group blocks
        groupHeaderBlocks = fixture.debugElement.query(By.css('.igx-grid__thead')).queryAll(By.css(GRID_MRL_BLOCK));
        expect(groupHeaderBlocks[1].nativeElement.clientWidth).toBe(436);

        firstRowCells = grid.rowList.first.cells.toArray();
        headerCells = grid.headerGroups.first.children.toArray();
        verifyLayoutHeadersAreAligned(headerCells, firstRowCells);
        verifyDOMMatchesLayoutSettings(grid.rowList.first, fixture.componentInstance.colGroups);

        fixture.componentInstance.colGroups = [{
            group: 'group1',
            columns: [
                { field: 'ID', rowStart: 1, colStart: 1 },
                { field: 'CompanyName', rowStart: 1, colStart: 2 },
                { field: 'ContactName', rowStart: 1, colStart: 3 },
                { field: 'Country', rowStart: 2, colStart: 1, colEnd: 3 },
                { field: 'Region', rowStart: 2, colStart: 3 },
                { field: 'ContactTitle', rowStart: 3, colStart: 1, rowEnd: 5, colEnd: 4, width: '60%' },
            ]
        }];
        fixture.detectChanges();
        fixture.detectChanges();

        // check columns
        expect(grid.getCellByColumn(0, 'ID').nativeElement.offsetWidth).toBe(200);
        expect(grid.getCellByColumn(0, 'CompanyName').nativeElement.offsetWidth).toBe(200);
        expect(grid.getCellByColumn(0, 'ContactName').nativeElement.offsetWidth).toBe(200);
        expect(grid.getCellByColumn(0, 'ContactTitle').nativeElement.offsetWidth).toBe(600);
        expect(grid.getCellByColumn(0, 'Country').nativeElement.offsetWidth).toBe(400);
        expect(grid.getCellByColumn(0, 'Region').nativeElement.offsetWidth).toBe(200);

        // check group blocks
        groupHeaderBlocks = fixture.debugElement.query(By.css('.igx-grid__thead')).queryAll(By.css(GRID_MRL_BLOCK));
        expect(groupHeaderBlocks[0].nativeElement.clientWidth).toBe(600);
        expect(groupHeaderBlocks[0].nativeElement.style.gridTemplateColumns).toEqual('200px 200px 200px');

        firstRowCells = grid.rowList.first.cells.toArray();
        headerCells = grid.headerGroups.first.children.toArray();
        verifyLayoutHeadersAreAligned(headerCells, firstRowCells);
        verifyDOMMatchesLayoutSettings(grid.rowList.first, fixture.componentInstance.colGroups);
    });
    it('should initialize correctly when grid width is in % and no widths are set for columns.', () => {
        const fixture = TestBed.createComponent(ColumnLayoutTestComponent);
        const grid = fixture.componentInstance.grid;
        fixture.componentInstance.colGroups = [{
            group: 'group1',
            columns: [
                { field: 'ID', rowStart: 1, colStart: 1 },
                { field: 'CompanyName', rowStart: 1, colStart: 2 },
                { field: 'ContactName', rowStart: 1, colStart: 3, colEnd: 5 },
                { field: 'ContactTitle', rowStart: 2, colStart: 1, rowEnd: 3, colEnd: 4 },
            ]
        }];
        fixture.componentInstance.grid.width = '100%';
        fixture.detectChanges();

        // check group blocks
        const groupHeaderBlocks = fixture.debugElement.query(By.css('.igx-grid__thead')).queryAll(By.css(GRID_MRL_BLOCK));
        expect(groupHeaderBlocks[0].nativeElement.clientWidth).toBe(groupHeaderBlocks[0].nativeElement.parentNode.clientWidth);

        const firstRowCells = grid.rowList.first.cells.toArray();
        const headerCells = grid.headerGroups.first.children.toArray();
        verifyLayoutHeadersAreAligned(headerCells, firstRowCells);
        verifyDOMMatchesLayoutSettings(grid.rowList.first, fixture.componentInstance.colGroups);
    });

    it('should use columns with the smallest col spans when determining the column group’s column widths.', () => {
        const fixture = TestBed.createComponent(ColumnLayoutTestComponent);
        fixture.componentInstance.colGroups = [{
            group: 'group2',
            columns: [
                { field: 'ContactName', rowStart: 2, colStart: 1, colEnd: 4, rowEnd: 4, width: '500px' },
                { field: 'CompanyName', rowStart: 1, colStart: 1, width: '100px' },
                { field: 'PostalCode', rowStart: 1, colStart: 2, width: '200px' },
                { field: 'Fax', rowStart: 1, colStart: 3, width: '100px' }
            ]
        }];
        fixture.detectChanges();

        // check group blocks
        let groupHeaderBlocks = fixture.debugElement.query(By.css('.igx-grid__thead')).queryAll(By.css(GRID_MRL_BLOCK));
        expect(groupHeaderBlocks[0].nativeElement.clientWidth).toBe(400);
        expect(groupHeaderBlocks[0].nativeElement.style.gridTemplateColumns).toBe('100px 200px 100px');
        fixture.componentInstance.colGroups = [{
            group: 'group2',
            columns: [
                { field: 'ContactName', rowStart: 1, colStart: 1, colEnd: 4, rowEnd: 2, width: '500px' },
                { field: 'CompanyName', rowStart: 2, colStart: 1, width: '100px' },
                { field: 'PostalCode', rowStart: 2, colStart: 2, width: '200px' },
                { field: 'Fax', rowStart: 2, colStart: 3, width: '100px' }
            ]
        }];
        fixture.detectChanges();
        // check group blocks
        groupHeaderBlocks = fixture.debugElement.query(By.css('.igx-grid__thead')).queryAll(By.css(GRID_MRL_BLOCK));
        expect(groupHeaderBlocks[0].nativeElement.clientWidth).toBe(400);
        expect(groupHeaderBlocks[0].nativeElement.style.gridTemplateColumns).toBe('100px 200px 100px');
    });

    it('should disregard column groups if multi-column layouts are also defined.', () => {
        const fixture = TestBed.createComponent(ColumnLayoutAndGroupsTestComponent);
        fixture.detectChanges();
        const grid = fixture.componentInstance.grid;

        // check grid's columns collection
        // 5 in total
        expect(grid.columnList.toArray().length).toBe(5);
        // 1 column layout
        expect(grid.columnList.filter(x => x.columnLayout).length).toBe(1);
        // 4 normal columns
        expect(grid.columnList.filter(x => !x.columnLayout && !x.columnGroup).length).toBe(4);

        // check header
        expect(document.querySelectorAll('igx-grid-header-group').length).toEqual(5);
        expect(document.querySelectorAll(GRID_COL_THEAD_CLASS).length).toEqual(4);
    });

    it('should render correct heights when groups have different total row span', () => {
        const fixture = TestBed.createComponent(ColumnLayoutAndGroupsTestComponent);
        const grid = fixture.componentInstance.grid;
        fixture.componentInstance.colGroups = [
            {
                group: 'group1',
                // group with total row span 1
                columns: [
                    { field: 'Fax', rowStart: 1, colStart: 1 }
                ]
            }, {
                group: 'group2',
                // group with total row span 2
                columns: [
                    { field: 'ContactName', rowStart: 1, colStart: 1, colEnd: 4, rowEnd: 2 },
                    { field: 'CompanyName', rowStart: 2, colStart: 1 },
                    { field: 'PostalCode', rowStart: 2, colStart: 2 },
                    { field: 'Fax', rowStart: 2, colStart: 3 }
                ]
            }];
        fixture.detectChanges();

        // check first group has height of 2 row spans in header and rows but the header itself should span 1 row
        // check group block and column header height
        const firstLayout = grid.columnList.toArray()[0];
        expect(grid.multiRowLayoutRowSize).toEqual(2);
        expect(firstLayout.getGridTemplate(true, false)).toEqual('repeat(2,1fr)');
        expect(firstLayout.headerGroup.element.nativeElement.offsetHeight).toBe((grid.rowHeight + 1) * 2);
        expect(grid.getColumnByName('Fax').headerCell.elementRef.nativeElement.offsetHeight).toBe(grid.rowHeight + 1);

        const secondLayout = grid.columnList.toArray()[2];
        const contactNameColumn = grid.getColumnByName('ContactName');
        expect(contactNameColumn.getGridTemplate(true, false)).toEqual('repeat(2,1fr)');
        expect(secondLayout.headerGroup.element.nativeElement.offsetHeight).toBe((grid.rowHeight + 1) * 2);

        // check cell height in row. By default should span 1 row
        const firstCell = grid.getCellByColumn(0, 'Fax').nativeElement;
        expect(firstCell.offsetHeight).toEqual(grid.getCellByColumn(0, 'ContactName').nativeElement.offsetHeight);
    });

    // Virtualization

    it('should apply horizontal virtualization based on the group blocks.', async () => {
        const fixture = TestBed.createComponent(ColumnLayoutTestComponent);
        const grid = fixture.componentInstance.grid;
        const uniqueGroups = [
            {
                group: 'group1',
                // total colspan 3
                columns: [
                    { field: 'Address', rowStart: 1, colStart: 1, colEnd: 4, rowEnd: 3 },
                    { field: 'County', rowStart: 3, colStart: 1 },
                    { field: 'Region', rowStart: 3, colStart: 2 },
                    { field: 'City', rowStart: 3, colStart: 3 }
                ]
            },
            {
                group: 'group2',
                // total colspan 2
                columns: [
                    { field: 'CompanyName', rowStart: 1, colStart: 1 },
                    { field: 'Address', rowStart: 1, colStart: 2 },
                    { field: 'ContactName', rowStart: 2, colStart: 1, colEnd: 3, rowEnd: 4 }
                ]
            },
            {
                group: 'group3',
                // total colspan 1
                columns: [
                    { field: 'Phone', rowStart: 1, colStart: 1 },
                    { field: 'Fax', rowStart: 2, colStart: 1, rowEnd: 4 }
                ]
            },
            {
                group: 'group4',
                // total colspan 4
                columns: [
                    { field: 'CompanyName', rowStart: 1, colStart: 1, colEnd: 3 },
                    { field: 'Phone', rowStart: 1, colStart: 3, rowEnd: 3 },
                    { field: 'Address', rowStart: 1, colStart: 4, rowEnd: 4 },
                    { field: 'Region', rowStart: 2, colStart: 1 },
                    { field: 'City', rowStart: 2, colStart: 2 },
                    { field: 'ContactName', rowStart: 3, colStart: 1, colEnd: 4 },
                ]
            }
        ];
        fixture.componentInstance.colGroups = [];
        for (let i = 0; i < 3; i++) {
            fixture.componentInstance.colGroups = fixture.componentInstance.colGroups.concat(uniqueGroups);
        }
        grid.columnWidth = '200px';
        fixture.componentInstance.grid.width = '600px';
        fixture.detectChanges();

        // 12 groups in total
        const horizontalVirtualization = grid.rowList.first.virtDirRow;
        expect(grid.hasHorizontalScroll()).toBeTruthy();
        expect(horizontalVirtualization.igxForOf.length).toBe(12);

        // check chunk size is correct
        expect(horizontalVirtualization.state.chunkSize).toBe(3);
        // check passed instances to igxFor are the groups
        expect(horizontalVirtualization.igxForOf[0] instanceof IgxColumnLayoutComponent).toBeTruthy();
        // check their sizes are correct
        expect(horizontalVirtualization.getSizeAt(0)).toBe(3 * 200);
        expect(horizontalVirtualization.getSizeAt(1)).toBe(2 * 200);
        expect(horizontalVirtualization.getSizeAt(2)).toBe(200);
        expect(horizontalVirtualization.getSizeAt(3)).toBe(4 * 200);

        // check total widths sum - unique col groups col span 10 in total * 200px default witdth * 3 times repeated
        const horizonatalScrElem = horizontalVirtualization.getScroll();
        const totalExpected = 10 * 200 * 3;
        expect(parseInt(horizonatalScrElem.children[0].style.width, 10)).toBe(totalExpected);
        // check groups are rendered correctly

        let firstRowCells = grid.rowList.first.cells.toArray();
        let headerCells = grid.headerGroups.first.children.toArray();
        verifyLayoutHeadersAreAligned(headerCells, firstRowCells);
        verifyDOMMatchesLayoutSettings(grid.rowList.first,
             fixture.componentInstance.colGroups.slice(0, horizontalVirtualization.state.chunkSize));

        // check last column group can be scrolled in view
        horizontalVirtualization.scrollTo(11);
        await wait(100);
        fixture.detectChanges();

        // last 3 blocks should be rendered
        firstRowCells = grid.rowList.first.cells.toArray();
        headerCells = grid.headerGroups.first.children.toArray();
        verifyLayoutHeadersAreAligned(headerCells, firstRowCells);
        verifyDOMMatchesLayoutSettings(grid.rowList.first,
             fixture.componentInstance.colGroups.slice(
                 horizontalVirtualization.state.startIndex,
                 horizontalVirtualization.state.startIndex + horizontalVirtualization.state.chunkSize));

    });

    it('should apply horizontal virtualization correctly for widths in px, % and no-width columns.', () => {
        const fixture = TestBed.createComponent(ColumnLayoutTestComponent);
        fixture.detectChanges();
        const grid = fixture.componentInstance.grid;
        // test with px
        fixture.componentInstance.colGroups = [{
            group: 'group1',
            // total colspan 3
            columns: [
                { field: 'Address', rowStart: 1, colStart: 1, colEnd: 4, rowEnd: 3 },
                { field: 'County', rowStart: 3, colStart: 1, width: '200px' },
                { field: 'Region', rowStart: 3, colStart: 2, width: '300px' },
                { field: 'City', rowStart: 3, colStart: 3, width: '200px' }
            ]
        }];
        fixture.componentInstance.grid.width = '617px';
        fixture.detectChanges();

        const horizontalVirtualization = grid.rowList.first.virtDirRow;
        expect(grid.hasHorizontalScroll()).toBeTruthy();
        expect(horizontalVirtualization.igxForOf.length).toBe(1);

        // check group size is correct
        expect(horizontalVirtualization.getSizeAt(0)).toBe(700);

        // check DOM
        let firstRowCells = grid.rowList.first.cells.toArray();
        let headerCells = grid.headerGroups.first.children.toArray();
        verifyLayoutHeadersAreAligned(headerCells, firstRowCells);
        verifyDOMMatchesLayoutSettings(grid.rowList.first, fixture.componentInstance.colGroups);

        // test with %
        fixture.componentInstance.colGroups.push({
            group: 'group2',
            // total colspan 2
            columns: [
                { field: 'CompanyName', rowStart: 1, colStart: 1, width: '20%' },
                { field: 'Address1', rowStart: 1, colStart: 2, width: '30%' },
                { field: 'ContactName', rowStart: 2, colStart: 1, colEnd: 3, rowEnd: 4 }
            ]
        });
        fixture.detectChanges();
        expect(grid.hasHorizontalScroll()).toBeTruthy();
        expect(horizontalVirtualization.igxForOf.length).toBe(2);

        // check group size is correct
        expect(horizontalVirtualization.getSizeAt(0)).toBe(700);
        expect(horizontalVirtualization.getSizeAt(1)).toBe(300);

        // check DOM
        firstRowCells = grid.rowList.first.cells.toArray();
        headerCells = grid.headerGroups.first.children.toArray();
        verifyLayoutHeadersAreAligned(headerCells, firstRowCells);
        verifyDOMMatchesLayoutSettings(grid.rowList.first, fixture.componentInstance.colGroups);

        // test with no width
        fixture.componentInstance.colGroups.push({
            group: 'group4',
            // total colspan 4
            columns: [
                { field: 'CompanyName', rowStart: 1, colStart: 1, colEnd: 3 },
                { field: 'Phone', rowStart: 1, colStart: 3, rowEnd: 3 },
                { field: 'Address', rowStart: 1, colStart: 4, rowEnd: 4 },
                { field: 'Region', rowStart: 2, colStart: 1 },
                { field: 'City', rowStart: 2, colStart: 2 },
                { field: 'ContactName', rowStart: 3, colStart: 1, colEnd: 4 },
            ]
        });

        fixture.detectChanges();
        expect(grid.hasHorizontalScroll()).toBeTruthy();
        expect(horizontalVirtualization.igxForOf.length).toBe(3);

        // check group size is correct
        expect(horizontalVirtualization.getSizeAt(0)).toBe(700);
        expect(horizontalVirtualization.getSizeAt(1)).toBe(300);
        expect(horizontalVirtualization.getSizeAt(2)).toBe(136 * 4);

        // check DOM
        firstRowCells = grid.rowList.first.cells.toArray();
        headerCells = grid.headerGroups.first.children.toArray();
        verifyLayoutHeadersAreAligned(headerCells, firstRowCells);
        verifyDOMMatchesLayoutSettings(grid.rowList.first, fixture.componentInstance.colGroups);
    });

    it('vertical virtualization should work as expected when there are multi-row layouts.', async() => {
        const fixture = TestBed.createComponent(ColumnLayoutTestComponent);
        const grid = fixture.componentInstance.grid;
        fixture.componentInstance.colGroups = [{
            group: 'group4',
            // total rowspan 3
            columns: [
                { field: 'CompanyName', rowStart: 1, colStart: 1, colEnd: 3 },
                { field: 'Phone', rowStart: 1, colStart: 3, rowEnd: 3 },
                { field: 'Address', rowStart: 1, colStart: 4, rowEnd: 4 },
                { field: 'Region', rowStart: 2, colStart: 1 },
                { field: 'City', rowStart: 2, colStart: 2 },
                { field: 'ContactName', rowStart: 3, colStart: 1, colEnd: 4 },
            ]
        }];
        fixture.detectChanges();

        const rows = fixture.debugElement.query(By.css('.igx-grid__tbody')).queryAll(By.css('igx-grid-row'));
        expect(rows.length).toEqual(4);
        expect(grid.hasVerticalSroll()).toBeTruthy();

        const verticalVirt = grid.verticalScrollContainer;

        // scroll to bottom
        const lastIndex = grid.data.length - 1;
        verticalVirt.scrollTo(lastIndex);
        await wait(100);
        verticalVirt.scrollTo(lastIndex);
        await wait(100);
        fixture.detectChanges();

        const dataRows = grid.dataRowList.toArray();
        const lastRow = dataRows[dataRows.length - 1];

        // check correct last row is rendered and is last in view
        expect(lastRow.dataRowIndex).toBe(lastIndex);
        expect(lastRow.rowData).toBe(grid.data[lastIndex]);

        // last in tbody
        expect(lastRow.element.nativeElement.getBoundingClientRect().bottom).toBe(grid.tbody.nativeElement.getBoundingClientRect().bottom);

        // check size is correct
        expect(grid.verticalScrollContainer.getSizeAt(lastIndex)).toBe(151);

        // check DOM
        const lastRowCells = lastRow.cells.toArray();
        const headerCells = grid.headerGroups.first.children.toArray();
        verifyLayoutHeadersAreAligned(headerCells, lastRowCells);
        verifyDOMMatchesLayoutSettings(lastRow, fixture.componentInstance.colGroups);
    });

    it('should correctly size columns without widths when default column width is set to percentages', () => {
        // In this case it would be for City column and 3rd template column overlapping width ContactName.
        const fixture = TestBed.createComponent(ColumnLayoutTestComponent);
        fixture.detectChanges();

        fixture.componentInstance.grid.width = '1200px';
        fixture.componentInstance.grid.columnWidth = '10%';
        fixture.detectChanges();
        fixture.componentInstance.colGroups = [{
            group: 'group1',
            columns: [
                { field: 'ContactName', rowStart: 1, colStart: 1, colEnd : 4},
                { field: 'ContactTitle', rowStart: 1, colStart: 4, colEnd: 6},
                { field: 'Country', rowStart: 1, colStart: 6, colEnd: 7},
                { field: 'Phone', rowStart: 2, colStart: 1, colEnd: 3},
                { field: 'City', rowStart: 2, colStart: 3, colEnd: 5},
                { field: 'Address', rowStart: 2, colStart: 5, colEnd: 7},
                { field: 'CompanyName', rowStart: 3, colStart: 1, colEnd: 2},
                { field: 'PostalCode', rowStart: 3, colStart: 2, colEnd: 3},
                { field: 'Fax', rowStart: 3, colStart: 3, colEnd: 7},
            ]
        }];
        fixture.detectChanges();
        const grid = fixture.componentInstance.grid;
        const gridFirstRow = grid.rowList.first;
        const firstRowCells = gridFirstRow.cells.toArray();
        const headerCells = grid.headerGroups.first.children.toArray();

        // headers are aligned to cells
        verifyLayoutHeadersAreAligned(headerCells, firstRowCells);

        const groupRowBlocks = fixture.debugElement.query(By.css('.igx-grid__tbody')).queryAll(By.css('.igx-grid__mrl-block'));
        expect(groupRowBlocks[0].nativeElement.style.gridTemplateColumns).toEqual('118px 118px 118px 118px 118px 118px');
    });

    it('should disregard hideGroupedColumns option and not hide columns when grouping when having column layouts.', () => {
        const fixture = TestBed.createComponent(ColumnLayoutTestComponent);
        fixture.componentInstance.colGroups = [{
            group: 'group1',
            columns: [
                { field: 'ContactName', rowStart: 1, colStart: 1, colEnd : 4},
                { field: 'ContactTitle', rowStart: 1, colStart: 4, colEnd: 6},
                { field: 'Country', rowStart: 1, colStart: 6, colEnd: 7},
                { field: 'Phone', rowStart: 2, colStart: 1, colEnd: 3},
                { field: 'City', rowStart: 2, colStart: 3, colEnd: 5},
                { field: 'Address', rowStart: 2, colStart: 5, colEnd: 7},
                { field: 'CompanyName', rowStart: 3, colStart: 1, colEnd: 2},
                { field: 'PostalCode', rowStart: 3, colStart: 2, colEnd: 3},
                { field: 'Fax', rowStart: 3, colStart: 3, colEnd: 7},
            ]
        }];
        const grid = fixture.componentInstance.grid;
        grid.hideGroupedColumns = true;
        fixture.detectChanges();

        grid.groupBy({ fieldName: 'ContactTitle', dir: SortingDirection.Desc, ignoreCase: false,
        strategy: DefaultSortingStrategy.instance() });
        fixture.detectChanges();

        // check column and group are not hidden
        const col = grid.getColumnByName('ContactTitle');
        expect(col.hidden).toBe(false);
        expect(col.parent.hidden).toBe(false);
    });
});

@Component({
    template: `
    <igx-grid #grid [data]="data" height="500px">
        <igx-column-layout *ngFor='let group of colGroups'>
            <igx-column *ngFor='let col of group.columns'
            [rowStart]="col.rowStart" [colStart]="col.colStart" [width]='col.width'
            [colEnd]="col.colEnd" [rowEnd]="col.rowEnd" [field]='col.field'></igx-column>
        </igx-column-layout>
    </igx-grid>
    `
})
export class ColumnLayoutTestComponent {
    @ViewChild(IgxGridComponent, { read: IgxGridComponent, static: true })
    grid: IgxGridComponent;
    cols: Array<any> = [
        { field: 'ID', rowStart: 1, colStart: 1 },
        { field: 'CompanyName', rowStart: 1, colStart: 2 },
        { field: 'ContactName', rowStart: 1, colStart: 3 },
        { field: 'ContactTitle', rowStart: 2, colStart: 1, rowEnd: 4, colEnd: 4 },
    ];
    colGroups = [
        {
            group: 'group1',
            columns: this.cols
        }
    ];
    data = SampleTestData.contactInfoDataFull();
}

@Component({
    template: `
    <igx-grid #grid [data]="data" height="500px">
        <igx-column-group header="General Information">
        <igx-column field="CompanyName"></igx-column>
            <igx-column-group [movable]="true" header="Person Details">
                <igx-column field="ContactName"></igx-column>
                <igx-column field="ContactTitle"></igx-column>
            </igx-column-group>
        </igx-column-group>
        <igx-column-layout *ngFor='let group of colGroups'>
            <igx-column *ngFor='let col of group.columns'
            [rowStart]="col.rowStart" [colStart]="col.colStart" [width]='col.width'
            [colEnd]="col.colEnd" [rowEnd]="col.rowEnd" [field]='col.field'></igx-column>
        </igx-column-layout>
    </igx-grid>
    `
})
export class ColumnLayoutAndGroupsTestComponent extends ColumnLayoutTestComponent {

}
