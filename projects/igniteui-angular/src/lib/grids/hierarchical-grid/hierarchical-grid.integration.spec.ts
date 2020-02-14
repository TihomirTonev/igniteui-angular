import { configureTestSuite } from '../../test-utils/configure-suite';
import { async, TestBed, tick, fakeAsync } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { IgxHierarchicalGridModule } from './index';
import { Component, ViewChild } from '@angular/core';
import { IgxHierarchicalGridComponent } from './hierarchical-grid.component';
import { IgxRowIslandComponent } from './row-island.component';
import { wait, UIInteractions } from '../../test-utils/ui-interactions.spec';
import { SortingDirection } from '../../data-operations/sorting-expression.interface';
import { DefaultSortingStrategy } from '../../data-operations/sorting-strategy';
import { IgxColumnMovingDragDirective } from '../moving/moving.drag.directive';
import { IgxColumnComponent } from '../columns/column.component';
import { IgxHierarchicalRowComponent } from './hierarchical-row.component';
import { IgxChildGridRowComponent } from './child-grid-row.component';
import { IgxStringFilteringOperand } from '../../data-operations/filtering-condition';
import { take } from 'rxjs/operators';
import { IgxHierarchicalTransactionServiceFactory } from './hierarchical-grid-base.directive';
import { IgxIconModule } from '../../icon';
import { IgxHierarchicalGridCellComponent } from './hierarchical-cell.component';
import { GridSelectionMode } from '../common/enums';
import { GridFunctions } from '../../test-utils/grid-functions.spec';

describe('IgxHierarchicalGrid Integration #hGrid', () => {
    configureTestSuite();
    let fixture;
    let hierarchicalGrid: IgxHierarchicalGridComponent;
    beforeAll(async(() => {
        TestBed.configureTestingModule({
            declarations: [
                IgxHierarchicalGridTestBaseComponent,
                IgxHierarchicalGridTestCustomToolbarComponent
            ],
            imports: [
                NoopAnimationsModule, IgxHierarchicalGridModule, IgxIconModule]
        }).compileComponents();
    }));

    beforeEach(async(() => {
        fixture = TestBed.createComponent(IgxHierarchicalGridTestBaseComponent);
        fixture.detectChanges();
        hierarchicalGrid = fixture.componentInstance.hgrid;
    }));

    describe('MCH', () => {
        it('should allow declaring column groups.', fakeAsync(/** row toggle rAF */() => {
            const expectedColumnGroups = 1;
            const expectedLevel = 1;

            expect(hierarchicalGrid.columnList.filter(col => col.columnGroup).length).toEqual(expectedColumnGroups);
            expect(hierarchicalGrid.getColumnByName('ProductName').level).toEqual(expectedLevel);

            expect(document.querySelectorAll('igx-grid-header').length).toEqual(3);

            const firstRow = hierarchicalGrid.dataRowList.toArray()[0];
            // first child of the row should expand indicator
            (firstRow.nativeElement.children[0] as HTMLElement).click();
            fixture.detectChanges();

            const childGrid = hierarchicalGrid.hgridAPI.getChildGrids(false)[0];

            expect(childGrid.columnList.filter(col => col.columnGroup).length).toEqual(expectedColumnGroups);
            expect(childGrid.getColumnByName('ProductName').level).toEqual(expectedLevel);

            expect(document.querySelectorAll('igx-grid-header').length).toEqual(6);
        }));

        it('should apply height correctly with and without filtering', fakeAsync(() => {
            let filteringCells = fixture.debugElement.queryAll(By.css('igx-grid-filtering-cell'));
            expect(hierarchicalGrid.nativeElement.offsetHeight).toBe(600);

            hierarchicalGrid.height = '800px';
            tick();
            fixture.detectChanges();
            expect(hierarchicalGrid.nativeElement.offsetHeight).toBe(800);
            expect(filteringCells.length).toBe(3);

            hierarchicalGrid.allowFiltering = false;
            fixture.detectChanges();
            expect(hierarchicalGrid.nativeElement.offsetHeight).toBe(800);
            filteringCells = fixture.debugElement.queryAll(By.css('igx-grid-filtering-cell'));
            expect(filteringCells.length).toBe(0);

        }));
    });

    describe('Selection', () => {
        it('should allow only one cell to be selected in the whole hierarchical grid.', (async () => {
            hierarchicalGrid.height = '500px';
            hierarchicalGrid.reflow();
            fixture.detectChanges();

        let firstRow = hierarchicalGrid.dataRowList.toArray()[0] as IgxHierarchicalRowComponent;
            (firstRow.nativeElement.children[0] as HTMLElement).click();
            fixture.detectChanges();
            expect(firstRow.expanded).toBeTruthy();

            let fCell = firstRow.cells.toArray()[0];

            // select parent cell
            fCell.nativeElement.focus();
            await wait(100);
            fixture.detectChanges();

            expect(fCell.selected).toBeTruthy();

            const childGrid =  hierarchicalGrid.hgridAPI.getChildGrids(false)[0];
            const firstChildRow = childGrid.dataRowList.toArray()[0];
            const fChildCell =  firstChildRow.cells.toArray()[0];

            // select child cell
            fChildCell.nativeElement.focus();
            await wait(100);
            fixture.detectChanges();

            expect(fChildCell.selected).toBeTruthy();
            expect(fCell.selected).toBeFalsy();

            // select parent cell
            firstRow = hierarchicalGrid.dataRowList.toArray()[0] as IgxHierarchicalRowComponent;
            fCell = firstRow.cells.toArray()[0];
            fCell.nativeElement.focus();
            await wait(100);
            fixture.detectChanges();
            expect(fChildCell.selected).toBeFalsy();
            expect(fCell.selected).toBeTruthy();
        }));
    });

    describe('Updating', () => {
        it(`should have separate instances of updating service for
        parent and children and the same for children of the same island`, fakeAsync(/** row toggle rAF */() => {
            const firstLayoutInstances: IgxHierarchicalGridComponent[] = [];
            hierarchicalGrid.childLayoutList.first.onGridCreated.pipe(take(2)).subscribe((args) => {
                firstLayoutInstances.push(args.grid);
            });
            // expand 1st row
            (hierarchicalGrid.dataRowList.toArray()[0].nativeElement.children[0] as HTMLElement).click();
            fixture.detectChanges();
            // expand 2nd row
            (hierarchicalGrid.dataRowList.toArray()[1].nativeElement.children[0] as HTMLElement).click();
            fixture.detectChanges();
            // test instances
            expect(firstLayoutInstances.length).toEqual(2);
            expect(hierarchicalGrid.transactions).not.toBe(firstLayoutInstances[0].transactions);
            expect(firstLayoutInstances[0].transactions).not.toBe(firstLayoutInstances[1].transactions);
        }));

        it('should contain all transactions for a row island', fakeAsync(/** row toggle rAF */() => {
            const firstLayoutInstances: IgxHierarchicalGridComponent[] = [];
            hierarchicalGrid.childLayoutList.first.onGridCreated.pipe(take(2)).subscribe((args) => {
                firstLayoutInstances.push(args.grid);
            });
            // expand 1st row
            (hierarchicalGrid.dataRowList.toArray()[0].nativeElement.children[0] as HTMLElement).click();
            fixture.detectChanges();
            // expand 2nd row
            (hierarchicalGrid.dataRowList.toArray()[1].nativeElement.children[0] as HTMLElement).click();
            fixture.detectChanges();
            firstLayoutInstances[0].updateRow({ ProductName: 'Changed' }, '00');
            firstLayoutInstances[1].updateRow({ ProductName: 'Changed' }, '10');
            expect(hierarchicalGrid.transactions.getTransactionLog().length).toEqual(0);
            expect(firstLayoutInstances[0].transactions.getTransactionLog().length).toEqual(1);
            expect(fixture.componentInstance.rowIsland.transactions.getTransactionLog().length).toEqual(0);
        }));

        it('should remove expand indicator for uncommitted added rows', (async () => {
            hierarchicalGrid.data = hierarchicalGrid.data.slice(0, 3);
            fixture.detectChanges();
            hierarchicalGrid.addRow({ ID: -1, ProductName: 'Name1' });
            fixture.detectChanges();
            const rows = fixture.debugElement.queryAll(By.directive(IgxHierarchicalRowComponent));
            const lastRow = rows[rows.length - 1];
            expect(lastRow.query(By.css('igx-icon')).nativeElement).toHaveClass('igx-icon--inactive');
            hierarchicalGrid.transactions.commit(hierarchicalGrid.data);
            fixture.detectChanges();
            expect(lastRow.query(By.css('igx-icon')).nativeElement).not.toHaveClass('igx-icon--inactive');
        }));

        it('should now allow expand using Ctrl + Right/Down for uncommitted added rows', (async () => {
            hierarchicalGrid.data = hierarchicalGrid.data.slice(0, 3);
            fixture.detectChanges();
            hierarchicalGrid.addRow({ ID: -1, ProductName: 'Name1' });
            fixture.detectChanges();
            const rows = fixture.debugElement.queryAll(By.directive(IgxHierarchicalRowComponent));
            const lastRowCells = rows[rows.length - 1].queryAll(By.directive(IgxHierarchicalGridCellComponent));

            lastRowCells[1].nativeElement.click();
            fixture.detectChanges();

            lastRowCells[1].nativeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', altKey: true }));
            fixture.detectChanges();

            let childRows = fixture.debugElement.queryAll(By.directive(IgxChildGridRowComponent));
            expect(childRows.length).toEqual(0);

            lastRowCells[1].nativeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', altKey: true }));
            fixture.detectChanges();

            childRows = fixture.debugElement.queryAll(By.directive(IgxChildGridRowComponent));
            expect(childRows.length).toEqual(0);

            hierarchicalGrid.transactions.commit(hierarchicalGrid.data);
            fixture.detectChanges();

            lastRowCells[1].nativeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', altKey: true }));
            fixture.detectChanges();

            childRows = fixture.debugElement.queryAll(By.directive(IgxChildGridRowComponent));
            expect(childRows.length).toEqual(1);
        }));

        it('should revert changes when transactions are cleared for child grids', fakeAsync(/** row toggle rAF */() => {
            let childGrid;
            hierarchicalGrid.childLayoutList.first.onGridCreated.pipe(take(1)).subscribe((args) => {
                childGrid = args.grid;
            });
            // expand 1st row
            (hierarchicalGrid.dataRowList.toArray()[0].nativeElement.children[0] as HTMLElement).click();
            fixture.detectChanges();
            childGrid.updateRow({ ProductName: 'Changed' }, '00');
            fixture.detectChanges();
            expect(childGrid.getCellByColumn(0, 'ProductName').nativeElement.innerText).toEqual('Changed');
            childGrid.transactions.clear();
            fixture.detectChanges();
            expect(childGrid.getCellByColumn(0, 'ProductName').nativeElement.innerText).toEqual('Product: A0');
        }));
    });

    describe('Sorting', () => {
        it('should display correct child data for expanded row after sorting.', (async () => {
            const firstRow = hierarchicalGrid.dataRowList.toArray()[0];
            // expand 1st row
            (firstRow.nativeElement.children[0] as HTMLElement).click();
            fixture.detectChanges();
            hierarchicalGrid.sort({
                fieldName: 'ID', dir: SortingDirection.Desc, ignoreCase: false, strategy: DefaultSortingStrategy.instance()
            });
            fixture.detectChanges();

            hierarchicalGrid.verticalScrollContainer.scrollTo(hierarchicalGrid.dataView.length - 1);
            await wait(100);
            fixture.detectChanges();
            hierarchicalGrid.verticalScrollContainer.scrollTo(hierarchicalGrid.dataView.length - 1);
            await wait(100);
            fixture.detectChanges();

            const childGrid =  hierarchicalGrid.hgridAPI.getChildGrids(false)[0];
            const fChildCell =  childGrid.dataRowList.toArray()[0].cells.toArray()[0];
            expect(childGrid.data).toBe(fixture.componentInstance.data[0]['childData']);
            expect(fChildCell.value).toBe('00');
        }));

        it('should allow sorting via headers in child grids', fakeAsync(/** row toggle rAF */() => {
            const firstRow = hierarchicalGrid.dataRowList.toArray()[0];
            // expand 1st row
            (firstRow.nativeElement.children[0] as HTMLElement).click();
            fixture.detectChanges();
            // enable sorting
            const childGrid =  hierarchicalGrid.hgridAPI.getChildGrids(false)[0];
            childGrid.columnList.toArray()[0].sortable = true;
            fixture.detectChanges();

            const childHeaders = fixture.debugElement.query(By.css('igx-child-grid-row')).queryAll(By.css('igx-grid-header'));
            childHeaders[0].nativeElement.click();
            fixture.detectChanges();
            childHeaders[0].nativeElement.click();
            fixture.detectChanges();

            const fChildCell =  childGrid.dataRowList.toArray()[0].cells.toArray()[0];
            expect(fChildCell.value).toBe('09');
            const icon = childHeaders[0].query(By.css('.sort-icon'));
            expect(icon).not.toBeNull();
            expect(icon.nativeElement.textContent.toLowerCase().trim()).toBe('arrow_downward');
        }));
    });

    // describe('GroupBy', () => {
    //     it('Data should be rendered correctly when children are expanded', async() => {
    //         const firstRow = hierarchicalGrid.dataRowList.toArray()[0];
    //         // expand 1st row
    //         (firstRow.nativeElement.children[0] as HTMLElement).click();
    //         await wait(100);
    //         hierarchicalGrid.cdr.detectChanges();

    //         hierarchicalGrid.groupBy({
    //             fieldName: 'ID', dir: SortingDirection.Asc, ignoreCase: false, strategy: DefaultSortingStrategy.instance()
    //         });
    //         hierarchicalGrid.cdr.detectChanges();
    //         await wait(100);

    //         expect(hierarchicalGrid.getRowByIndex(0) instanceof IgxGridGroupByRowComponent).toBeTruthy();
    //         expect(hierarchicalGrid.getRowByIndex(1) instanceof IgxHierarchicalRowComponent).toBeTruthy();
    //         expect(hierarchicalGrid.getRowByIndex(2) instanceof IgxChildGridRowComponent).toBeTruthy();

    //         hierarchicalGrid.clearGrouping('ID');
    //         hierarchicalGrid.cdr.detectChanges();
    //         fixture.detectChanges();
    //         expect(hierarchicalGrid.getRowByIndex(0) instanceof IgxHierarchicalRowComponent).toBeTruthy();
    //         expect(hierarchicalGrid.getRowByIndex(1) instanceof IgxChildGridRowComponent).toBeTruthy();
    //         expect(hierarchicalGrid.getRowByIndex(2) instanceof IgxHierarchicalRowComponent).toBeTruthy();
    //     });

    //     it('child grids data should be correct after grouping in parent grid.',  (async () => {
    //         const firstRow = hierarchicalGrid.dataRowList.toArray()[0];
    //         // expand 1st row
    //         (firstRow.nativeElement.children[0] as HTMLElement).click();
    //         fixture.detectChanges();

    //         const sRow = hierarchicalGrid.dataRowList.toArray()[1];
    //         // expand 2nd row
    //         sRow.nativeElement.children[0].click();
    //         fixture.detectChanges();

    //         hierarchicalGrid.groupBy({
    //             fieldName: 'ID', dir: SortingDirection.Desc, ignoreCase: false, strategy: DefaultSortingStrategy.instance()
    //         });
    //         fixture.detectChanges();

    //         hierarchicalGrid.verticalScrollContainer.scrollTo(hierarchicalGrid.dataView.length - 1);
    //         await wait(100);
    //         fixture.detectChanges();
    //         hierarchicalGrid.verticalScrollContainer.scrollTo(hierarchicalGrid.dataView.length - 1);
    //         await wait(100);
    //         fixture.detectChanges();
    //         const childGrids =  fixture.debugElement.queryAll(By.css('igx-child-grid-row'));
    //         const childGrid1 = childGrids[0].query(By.css('igx-hierarchical-grid')).componentInstance;
    //         const childGrid2 = childGrids[1].query(By.css('igx-hierarchical-grid')).componentInstance;

    //         expect(childGrid1.data).toBe(fixture.componentInstance.data[1]['childData']);
    //         expect(childGrid2.data).toBe(fixture.componentInstance.data[0]['childData']);
    //     }));

    //     it('virtualization should work as expected when scrolling in grid with expanded children and grouped columns.',  (async () => {
    //         // expand 1st row
    //         (hierarchicalGrid.dataRowList.toArray()[0].nativeElement.children[0] as HTMLElement).click();
    //         fixture.detectChanges();
    //         // expand 2nd row
    //         (hierarchicalGrid.dataRowList.toArray()[1].nativeElement.children[0] as HTMLElement).click();
    //         fixture.detectChanges();

    //         hierarchicalGrid.groupBy({
    //             fieldName: 'ID', dir: SortingDirection.Asc, ignoreCase: false, strategy: DefaultSortingStrategy.instance()
    //         });
    //         fixture.detectChanges();

    //         hierarchicalGrid.verticalScrollContainer.scrollTo(10);
    //         await wait(100);
    //         fixture.detectChanges();

    //         const childGrids =  fixture.debugElement.queryAll(By.css('igx-child-grid-row'));
    //         const childGrid = childGrids[0].query(By.css('igx-hierarchical-grid')).componentInstance;
    //         expect(childGrid.data).toBe(fixture.componentInstance.data[1]['childData']);

    //     }));
    // });

    describe('Filtering', () => {
        it('should enable filter-row for root and child grids', fakeAsync(/** filter showHideArrowButtons + row toggle rAF */() => {
            let filteringCells = fixture.debugElement.queryAll(By.css('igx-grid-filtering-cell'));

            expect(filteringCells.length).toEqual(3);
            filteringCells[0].query(By.css('igx-chip')).nativeElement.click();
            fixture.detectChanges();
            expect(document.querySelectorAll('igx-grid-filtering-row').length).toEqual(1);

            const firstRow = hierarchicalGrid.dataRowList.toArray()[0];
            // first child of the row should expand indicator
            (firstRow.nativeElement.children[0] as HTMLElement).click();
            fixture.detectChanges();

            filteringCells = fixture.debugElement.queryAll(By.css('igx-grid-filtering-cell'));
            expect(filteringCells.length).toEqual(6);
            filteringCells[3].query(By.css('igx-chip')).nativeElement.click();
            fixture.detectChanges();
            expect(document.querySelectorAll('igx-grid-filtering-row').length).toEqual(2);
        }));

        it('should not lose child grid states after filtering in parent grid.', fakeAsync(() => {
            // expand 1st row
            (hierarchicalGrid.dataRowList.toArray()[0].nativeElement.children[0] as HTMLElement).click();
            fixture.detectChanges();
            const childGrids =  fixture.debugElement.queryAll(By.css('igx-child-grid-row'));
            let childGrid = childGrids[0].query(By.css('igx-hierarchical-grid')).componentInstance;
            let fChildCell =  childGrid.dataRowList.toArray()[0].cells.toArray()[0];
            fChildCell.nativeElement.focus({preventScroll: true});
            fixture.detectChanges();
            expect(fChildCell.selected).toBe(true);
            hierarchicalGrid.filter('ID', '0', IgxStringFilteringOperand.instance().condition('contains'), true);
            fixture.detectChanges();
            expect((<IgxHierarchicalRowComponent>hierarchicalGrid.getRowByIndex(0)).expanded).toBe(true);
            expect(hierarchicalGrid.getRowByIndex(0) instanceof IgxHierarchicalRowComponent).toBeTruthy();
            expect(hierarchicalGrid.getRowByIndex(1) instanceof IgxChildGridRowComponent).toBeTruthy();

            childGrid = childGrids[0].query(By.css('igx-hierarchical-grid')).componentInstance;
            fChildCell =  childGrid.dataRowList.toArray()[0].cells.toArray()[0];
            expect(fChildCell.selected).toBe(true);
        }));

        it('should show empty filter message when there are no records matching the filter', fakeAsync(() => {
            fixture.componentInstance.data = [];
            fixture.detectChanges();

            const gridBody = fixture.debugElement.query(By.css('.igx-grid__tbody-content'));
            expect(gridBody.nativeElement.innerText).toMatch(hierarchicalGrid.emptyGridMessage);

            fixture.componentInstance.data = fixture.componentInstance.generateData(40, 3);
            fixture.detectChanges();

            hierarchicalGrid.filter('ID', '123450', IgxStringFilteringOperand.instance().condition('contains'), true);
            fixture.detectChanges();
            expect(gridBody.nativeElement.innerText).toMatch(hierarchicalGrid.emptyFilteredGridMessage);
        }));

        it('should apply classes to the header when filter row is visible', fakeAsync(/** filter showHideArrowButtons rAF */() => {
            hierarchicalGrid.rowSelection = GridSelectionMode.multiple;
            fixture.detectChanges();
            const headerExpander: HTMLElement = fixture.nativeElement.querySelector('.igx-grid__hierarchical-expander');
            const headerCheckbox: HTMLElement = fixture.nativeElement.querySelector('.igx-grid__cbx-selection');

            expect(headerExpander.classList.contains('igx-grid__hierarchical-expander--push')).toBeFalsy();
            expect(headerCheckbox.classList.contains('igx-grid__cbx-selection--push')).toBeFalsy();

            // open filter row
            const filteringCells = fixture.debugElement.queryAll(By.css('igx-grid-filtering-cell'));
            const filterCellChip = filteringCells[0].query(By.css('igx-chip'));
            filterCellChip.nativeElement.click();
            fixture.detectChanges();

            expect(headerExpander.classList.contains('igx-grid__hierarchical-expander--push')).toBeTruthy();
            expect(headerCheckbox.classList.contains('igx-grid__cbx-selection--push')).toBeTruthy();
        }));
    });

    describe('Summaries', () => {
        const SUMMARIES_MARGIN_CLASS = '.igx-grid__summaries-patch';
        it('should allow defining summaries for child grid and child should be sized correctly.', fakeAsync(/** row toggle rAF */() => {
            (hierarchicalGrid.dataRowList.toArray()[0].nativeElement.children[0] as HTMLElement).click();
            fixture.detectChanges();

            const childGrids =  fixture.debugElement.queryAll(By.css('igx-child-grid-row'));
            const childGrid = childGrids[0].query(By.css('igx-hierarchical-grid')).componentInstance;
            const expander =  childGrid.dataRowList.toArray()[0].expander;

            // Expect expansion cell to be rendered and sized the same as the expansion cell inside the grid
            const summaryRow = childGrid.summariesRowList.first.nativeElement;
            const summaryRowIndentation = summaryRow.querySelector(SUMMARIES_MARGIN_CLASS);
            expect(summaryRow.children.length).toEqual(2);
            expect(summaryRowIndentation.offsetWidth).toEqual(expander.nativeElement.offsetWidth);

            const gridHeight = childGrid.nativeElement.offsetHeight;
            const childElems: HTMLElement[] = Array.from(childGrid.nativeElement.children);
            const elementsHeight = childElems.map(elem => elem.offsetHeight).reduce((total, height) => {
                return total + height;
            }, 0);

            // Expect the combined height of all elements (header, body, footer etc) to equal the calculated height of the grid.
            expect(elementsHeight).toEqual(gridHeight);

            childGrid.dataRowList.toArray()[0].nativeElement.children[0].click();
            fixture.detectChanges();

            const childGridDebugElement = childGrids[0].query(By.css('igx-hierarchical-grid'));
            const grandChild = childGridDebugElement.query(By.css('igx-hierarchical-grid')).componentInstance;
            const grandChildSummaryRow = grandChild.summariesRowList.first.nativeElement;
            const childSummaryRowIndentation = grandChildSummaryRow.querySelector(SUMMARIES_MARGIN_CLASS);

            expect(grandChildSummaryRow.children.length).toEqual(1);
            expect(childSummaryRowIndentation).toBeNull();
        }));

        it('should size summaries with row selectors for parent and children grids correctly.', fakeAsync(/** row toggle rAF */() => {
            hierarchicalGrid.rowSelectable = true;
            (hierarchicalGrid.dataRowList.toArray()[0].nativeElement.children[0] as HTMLElement).click();
            fixture.detectChanges();
            tick(16);

            const rootExpander =  (hierarchicalGrid.dataRowList.toArray()[0] as IgxHierarchicalRowComponent).expander;
            const rootCheckbox =  hierarchicalGrid.headerSelectorContainer;
            const rootSummaryRow = hierarchicalGrid.summariesRowList.first.nativeElement;
            const rootSummaryIndentation = rootSummaryRow.querySelector(SUMMARIES_MARGIN_CLASS);

            expect(rootSummaryRow.children.length).toEqual(2);
            expect(rootSummaryIndentation.offsetWidth)
                .toEqual(rootExpander.nativeElement.offsetWidth + rootCheckbox.nativeElement.offsetWidth);

            const childGrids =  fixture.debugElement.queryAll(By.css('igx-child-grid-row'));
            const childGrid = childGrids[0].query(By.css('igx-hierarchical-grid')).componentInstance;
            const expander =  childGrid.dataRowList.toArray()[0].expander;

            // Expect expansion cell to be rendered and sized the same as the expansion cell inside the grid
            const summaryRow = childGrid.summariesRowList.first.nativeElement;
            const childSummaryIndentation = summaryRow.querySelector(SUMMARIES_MARGIN_CLASS);

            expect(summaryRow.children.length).toEqual(2);
            expect(childSummaryIndentation.offsetWidth).toEqual(expander.nativeElement.offsetWidth);
        }));

        it('should render summaries for column inside a column group.', fakeAsync(/** row toggle rAF */() => {
            fixture.componentInstance.rowIsland.childColumns.first.hasSummary = false;
            tick();
            fixture.detectChanges();
            fixture.componentInstance.rowIsland.childColumns.last.hasSummary = true;
            tick();
            fixture.detectChanges();

            (hierarchicalGrid.dataRowList.toArray()[0].nativeElement.children[0] as HTMLElement).click();
            tick();
            fixture.detectChanges();

            const childGrids =  fixture.debugElement.queryAll(By.css('igx-child-grid-row'));
            const childGrid = childGrids[0].query(By.css('igx-hierarchical-grid')).componentInstance;

            const summaryRow = childGrid.summariesRowList.first;
            expect(summaryRow.nativeElement.children.length).toEqual(2);
            expect(summaryRow.summaryCells.length).toEqual(3);
        }));
    });

    describe('Paging', () => {
        it('should work on data records only when paging is enabled and should not be affected by child grid rows.', (async() => {
            hierarchicalGrid.paging = true;
            hierarchicalGrid.reflow();
            fixture.detectChanges();

            expect(hierarchicalGrid.dataView.length).toEqual(15);

            (hierarchicalGrid.dataRowList.toArray()[1].nativeElement.children[0] as HTMLElement).click();
            fixture.detectChanges();
            expect(hierarchicalGrid.dataView.length).toEqual(16);

            (hierarchicalGrid.dataRowList.toArray()[0].nativeElement.children[0] as HTMLElement).click();
            fixture.detectChanges();
            expect(hierarchicalGrid.dataView.length).toEqual(17);

            hierarchicalGrid.verticalScrollContainer.scrollTo(hierarchicalGrid.dataView.length - 1);
            await wait(100);
            fixture.detectChanges();

            expect(hierarchicalGrid.dataRowList.last.cells.first.value).toEqual('14');
        }));

        it('should preserve expansion states after changing pages.', fakeAsync(/** row toggle rAF */() => {
            hierarchicalGrid.paging = true;
            hierarchicalGrid.reflow();
            fixture.detectChanges();

            (hierarchicalGrid.dataRowList.toArray()[1].nativeElement.children[0] as HTMLElement).click();
            fixture.detectChanges();
            (hierarchicalGrid.dataRowList.toArray()[0].nativeElement.children[0] as HTMLElement).click();
            fixture.detectChanges();

            expect((hierarchicalGrid.dataRowList.toArray()[0] as IgxHierarchicalRowComponent).expanded).toBeTruthy();
            expect((hierarchicalGrid.dataRowList.toArray()[1] as IgxHierarchicalRowComponent).expanded).toBeTruthy();
            expect(hierarchicalGrid.dataView.length).toEqual(17);

            let childGrids =  fixture.debugElement.queryAll(By.css('igx-child-grid-row'));
            let childGrid = childGrids[0].query(By.css('igx-hierarchical-grid')).componentInstance;
            expect(childGrids.length).toEqual(2);
            expect(childGrid.dataRowList.first.cells.first.value).toEqual('00');

            // Go to next page
            GridFunctions.navigateToNextPage(hierarchicalGrid.nativeElement);
            fixture.detectChanges();

            expect(hierarchicalGrid.dataRowList.toArray()[0].cells.first.value).toEqual('15');
            expect((hierarchicalGrid.dataRowList.toArray()[0] as IgxHierarchicalRowComponent).expanded).toBeFalsy();
            expect((hierarchicalGrid.dataRowList.toArray()[1] as IgxHierarchicalRowComponent).expanded).toBeFalsy();
            expect(hierarchicalGrid.dataView.length).toEqual(15);

            childGrids =  fixture.debugElement.queryAll(By.css('igx-child-grid-row'));
            expect(childGrids.length).toEqual(0);

            // Return to previous page
            GridFunctions.navigateToPrevPage(hierarchicalGrid.nativeElement);
            fixture.detectChanges();

            expect(hierarchicalGrid.dataRowList.toArray()[0].cells.first.value).toEqual('0');
            expect((hierarchicalGrid.dataRowList.toArray()[0] as IgxHierarchicalRowComponent).expanded).toBeTruthy();
            expect((hierarchicalGrid.dataRowList.toArray()[1] as IgxHierarchicalRowComponent).expanded).toBeTruthy();
            expect(hierarchicalGrid.dataView.length).toEqual(17);

            childGrids =  fixture.debugElement.queryAll(By.css('igx-child-grid-row'));
            childGrid = childGrids[0].query(By.css('igx-hierarchical-grid')).componentInstance;
            expect(childGrids.length).toEqual(2);
            expect(childGrid.dataRowList.first.cells.first.value).toEqual('00');
        }));

        it('should allow scrolling to the last row after page size has been changed and rows are expanded.', (async() => {
            hierarchicalGrid.paging = true;
            hierarchicalGrid.perPage = 20;
            hierarchicalGrid.reflow();
            await wait(60);
            fixture.detectChanges();
            expect(hierarchicalGrid.hasVerticalSroll()).toBeTruthy();
            hierarchicalGrid.perPage = 5;
            await wait(30);
            fixture.detectChanges();
            await wait(30);

            expect(hierarchicalGrid.hasVerticalSroll()).toBeFalsy();

            // expand first
            (hierarchicalGrid.getRowByKey('0').nativeElement.children[0] as HTMLElement).click();
            await wait(30);
            fixture.detectChanges();

            expect(hierarchicalGrid.hasVerticalSroll()).toBeTruthy();

            // scroll bottom
            hierarchicalGrid.verticalScrollContainer.scrollTo(hierarchicalGrid.dataView.length - 1);
            await wait(30);
            fixture.detectChanges();

            // check last row is loaded and is in view
            let rows = hierarchicalGrid.rowList.toArray();
            let lastRow = rows[rows.length - 1];

            expect(lastRow instanceof IgxHierarchicalRowComponent).toBeTruthy();
            expect(lastRow.index).toBe(5);
            expect(lastRow.rowData).toBe(fixture.componentInstance.data[4]);

            (hierarchicalGrid.getRowByKey('1').nativeElement.children[0] as HTMLElement).click();
            await wait(30);
            fixture.detectChanges();
            hierarchicalGrid.verticalScrollContainer.scrollTo(hierarchicalGrid.dataView.length - 1);
            await wait(60);
            fixture.detectChanges();
            await wait(60);

            // check last row is loaded and is in view
            rows = hierarchicalGrid.rowList.toArray();
            lastRow = rows[rows.length - 1];

            expect(lastRow instanceof IgxHierarchicalRowComponent).toBeTruthy();
            expect(lastRow.index).toBe(6);
            expect(lastRow.rowData).toBe(fixture.componentInstance.data[4]);

            (hierarchicalGrid.getRowByKey('2').nativeElement.children[0] as HTMLElement).click();
            await wait(30);
            fixture.detectChanges();
            hierarchicalGrid.verticalScrollContainer.scrollTo(hierarchicalGrid.dataView.length - 1);
            await wait(30);
            fixture.detectChanges();

            // check last row is loaded and is in view
            rows = hierarchicalGrid.rowList.toArray();
            lastRow = rows[rows.length - 1];

            expect(lastRow instanceof IgxHierarchicalRowComponent).toBeTruthy();
            expect(lastRow.index).toBe(7);
            expect(lastRow.rowData).toBe(fixture.componentInstance.data[4]);

            (hierarchicalGrid.getRowByKey('3').nativeElement.children[0] as HTMLElement).click();
            await wait(30);
            fixture.detectChanges();
            hierarchicalGrid.verticalScrollContainer.scrollTo(hierarchicalGrid.dataView.length - 1);
            await wait(30);
            fixture.detectChanges();

            // check last row is loaded and is in view
            rows = hierarchicalGrid.rowList.toArray();
            lastRow = rows[rows.length - 1];

            expect(lastRow instanceof IgxHierarchicalRowComponent).toBeTruthy();
            expect(lastRow.index).toBe(8);
            expect(lastRow.rowData).toBe(fixture.componentInstance.data[4]);

            (hierarchicalGrid.getRowByKey('4').nativeElement.children[0] as HTMLElement).click();
            await wait(30);
            fixture.detectChanges();
            hierarchicalGrid.verticalScrollContainer.scrollTo(hierarchicalGrid.dataView.length - 1);
            await wait(30);
            fixture.detectChanges();

            // check last row is loaded and is in view
            rows = hierarchicalGrid.rowList.toArray();
            lastRow = rows[rows.length - 1];

            expect(lastRow instanceof IgxChildGridRowComponent).toBeTruthy();
            expect(lastRow.index).toBe(9);
        }));

        it('should corerctly hide/show vertical scrollbar after page is changed.', (async() => {
            hierarchicalGrid.paging = true;
            hierarchicalGrid.perPage = 5;
            fixture.detectChanges();
            await wait(30);
            fixture.detectChanges();

            expect(hierarchicalGrid.hasVerticalSroll()).toBeFalsy();

            // expand row
            (hierarchicalGrid.dataRowList.toArray()[1].nativeElement.children[0] as HTMLElement).click();
            fixture.detectChanges();
            await wait(30);
            fixture.detectChanges();

            expect(hierarchicalGrid.hasVerticalSroll()).toBeTruthy();

            // change page
            hierarchicalGrid.page = 1;
            fixture.detectChanges();
            await wait(30);
            fixture.detectChanges();

            expect(hierarchicalGrid.hasVerticalSroll()).toBeFalsy();

            // change page
            hierarchicalGrid.page = 0;
            fixture.detectChanges();
            await wait(30);
            fixture.detectChanges();
            await wait(30);
            fixture.detectChanges();

            expect(hierarchicalGrid.hasVerticalSroll()).toBeTruthy();
        }));
    });

    describe('Toolbar', () => {
        it('should be displayed correctly for child layout and hiding should apply to the correct child.',
        fakeAsync(/** row toggle rAF */() => {
            (hierarchicalGrid.dataRowList.toArray()[0].nativeElement.children[0] as HTMLElement).click();
            fixture.detectChanges();

            const childGrids =  fixture.debugElement.queryAll(By.css('igx-child-grid-row'));
            const childGrid = childGrids[0].query(By.css('igx-hierarchical-grid')).componentInstance;
            const toolbar = fixture.debugElement.query(By.css('igx-grid-toolbar'));
            const hideButton = toolbar.queryAll(By.css('button')).find((b) => b.nativeElement.name === 'btnColumnHiding');

            // Check visible columns and headers are rendered correctly
            let childHeaders = childGrids[0].queryAll(By.css('igx-grid-header'));
            expect(childGrid.visibleColumns.length).toEqual(4);
            expect(childHeaders.length).toEqual(3);

            // Check hiding button is rendered
            expect(hideButton).toBeDefined();
            hideButton.nativeElement.click();
            fixture.detectChanges();

            const hidingDropdown = toolbar.query(By.css('igx-column-hiding'));
            const columnsCheckboxes = hidingDropdown.queryAll(By.css('igx-checkbox')).map(elem => elem.componentInstance);

            // Check hiding dropdown is rendered when clicked with correct items in it
            expect(columnsCheckboxes.length).toEqual(4);
            expect(columnsCheckboxes[0].placeholderLabel.nativeElement.innerText.trim()).toEqual('ID');
            expect(columnsCheckboxes[1].placeholderLabel.nativeElement.innerText.trim()).toEqual('Information');
            expect(columnsCheckboxes[2].placeholderLabel.nativeElement.innerText.trim()).toEqual('ChildLevels');
            expect(columnsCheckboxes[3].placeholderLabel.nativeElement.innerText.trim()).toEqual('ProductName');

            (columnsCheckboxes[2].nativeCheckbox.nativeElement as HTMLElement).click();
            fixture.detectChanges();

            expect(columnsCheckboxes[2].checked).toBeTruthy();

            // Check visible columns and headers
            childHeaders = childGrids[0].queryAll(By.css('igx-grid-header'));
            expect(childGrid.visibleColumns.length).toEqual(3);
            expect(childHeaders.length).toEqual(2);
        }));

        it('no rows, headers, paging or rowSelectors should be displayed when hideAll columns', fakeAsync(() => {
            hierarchicalGrid.rowSelection = GridSelectionMode.multiple;
            hierarchicalGrid.rowDraggable = true;
            hierarchicalGrid.paging = true;
            tick(30);
            fixture.detectChanges();

            let fixEl = fixture.nativeElement;
            let tHeadItems = fixEl.querySelector('igx-grid-header-group');
            let gridRows = fixEl.querySelector('igx-hierarchical-grid-row');
            let paging = fixEl.querySelector('.igx-paginator');
            let rowSelectors = fixEl.querySelector('.igx-checkbox');
            let dragIndicators = fixEl.querySelector('.igx-grid__drag-indicator');
            let verticalScrollBar = fixEl.querySelector('.igx-grid__tbody-scrollbar[hidden]');
            let expander = fixEl.querySelector('.igx-grid__hierarchical-expander[hidden]');

            expect(tHeadItems).not.toBeNull();
            expect(gridRows).not.toBeNull();
            expect(paging).not.toBeNull();
            expect(rowSelectors).not.toBeNull();
            expect(dragIndicators).not.toBeNull();
            expect(expander).toBeNull();
            expect(verticalScrollBar).toBeNull();

            hierarchicalGrid.columnList.forEach((col) => col.hidden = true);
            tick(30);
            fixture.detectChanges();
            fixEl = fixture.nativeElement;
            tHeadItems = fixEl.querySelector('igx-grid-header-group');
            gridRows = fixEl.querySelector('igx-hierarchical-grid-row');
            paging = fixEl.querySelector('.igx-paginator');
            rowSelectors = fixEl.querySelector('.igx-checkbox');
            dragIndicators = fixEl.querySelector('.igx-grid__drag-indicator');
            expander = fixEl.querySelector('.igx-grid__hierarchical-expander[hidden]');
            verticalScrollBar = fixEl.querySelector('.igx-grid__tbody-scrollbar[hidden]');

            expect(tHeadItems).toBeNull();
            expect(gridRows).toBeNull();
            expect(paging).toBeNull();
            expect(rowSelectors).toBeNull();
            expect(dragIndicators).toBeNull();
            expect(expander).not.toBeNull();
            expect(verticalScrollBar).not.toBeNull();
        }));

        it('should be displayed correctly for child layout and pinning should apply to the correct child.',
        fakeAsync(/** row toggle rAF */() => {
            (hierarchicalGrid.dataRowList.toArray()[0].nativeElement.children[0] as HTMLElement).click();
            fixture.detectChanges();

            const childGrids =  fixture.debugElement.queryAll(By.css('igx-child-grid-row'));
            const childGrid = childGrids[0].query(By.css('igx-hierarchical-grid')).componentInstance;
            const toolbar = fixture.debugElement.query(By.css('igx-grid-toolbar'));
            const pinButton = toolbar.queryAll(By.css('button')).find((b) => b.nativeElement.name === 'btnColumnPinning');

            // Check visible columns and headers are rendered correctly
            let childHeaders = childGrids[0].queryAll(By.css('igx-grid-header'));
            expect(childGrid.pinnedColumns.length).toEqual(0);
            expect(childHeaders[0].children[0].nativeElement.children[0].children[0].innerText.trim()).toEqual('ID');
            expect(childHeaders[1].children[0].nativeElement.innerText.trim()).toEqual('ChildLevels');
            expect(childHeaders[2].children[0].nativeElement.innerText.trim()).toEqual('ProductName');

            // Check hiding button is rendered
            expect(pinButton).toBeDefined();

            pinButton.nativeElement.click();
            fixture.detectChanges();

            const pinningDropdown = toolbar.query(By.css('igx-column-pinning'));
            const columnsCheckboxes = pinningDropdown.queryAll(By.css('igx-checkbox')).map(elem => elem.componentInstance);

            // Check hiding dropdown is rendered when clicked with correct items in it
            expect(columnsCheckboxes.length).toEqual(2);
            expect(columnsCheckboxes[0].placeholderLabel.nativeElement.innerText.trim()).toEqual('ID');
            expect(columnsCheckboxes[1].placeholderLabel.nativeElement.innerText.trim()).toEqual('Information');

            columnsCheckboxes[1].nativeCheckbox.nativeElement.click();
            fixture.detectChanges();

            expect(columnsCheckboxes[1].checked).toBeTruthy();

            // Check visible columns and headers
            childHeaders = childGrids[0].queryAll(By.css('igx-grid-header'));
            expect(childGrid.pinnedColumns.length).toEqual(3);
            expect(childHeaders[0].children[0].nativeElement.innerText.trim()).toEqual('ChildLevels');
            expect(childHeaders[1].children[0].nativeElement.innerText.trim()).toEqual('ProductName');
            expect(childHeaders[2].children[0].nativeElement.children[0].children[0].innerText.trim()).toEqual('ID');
        }));

        it('should read from custom templates per level', fakeAsync(/** row toggle + height/width setter rAF */() => {
            fixture = TestBed.createComponent(IgxHierarchicalGridTestCustomToolbarComponent);
            fixture.detectChanges();
            hierarchicalGrid = fixture.componentInstance.hgrid;
            (hierarchicalGrid.dataRowList.toArray()[0].nativeElement.children[0] as HTMLElement).click();

            const toolbars = fixture.debugElement.queryAll(By.css('igx-grid-toolbar'));
            expect(toolbars.length).toEqual(3);
            expect(toolbars[0].query(By.css('button')).nativeElement.innerText.trim()).toEqual('Parent Button');
            expect(toolbars[1].query(By.css('button')).nativeElement.innerText.trim()).toEqual('Child 1 Button');
            expect(toolbars[2].query(By.css('button')).nativeElement.innerText.trim()).toEqual('Child 2 Button');
        }));

        it('should have same width as the grid whole width', fakeAsync(/** height/width setter rAF */() => {
            fixture = TestBed.createComponent(IgxHierarchicalGridTestCustomToolbarComponent);
            fixture.detectChanges();
            hierarchicalGrid = fixture.componentInstance.hgrid;

            const toolbar = fixture.debugElement.query(By.css('igx-grid-toolbar'));
            expect(toolbar.nativeElement.offsetWidth).toEqual(hierarchicalGrid.nativeElement.offsetWidth);
        }));
    });

    describe('Moving', () => {
        it('should not be possible to drag move a column from another grid.', (async() => {
            (hierarchicalGrid.dataRowList.toArray()[0].nativeElement.children[0] as HTMLElement).click();
            fixture.detectChanges();

            const childGrids =  fixture.debugElement.queryAll(By.css('igx-child-grid-row'));
            const childGrid = childGrids[0].query(By.css('igx-hierarchical-grid')).componentInstance;
            const childHeader = childGrids[0].queryAll(By.css('igx-grid-header'))[0].nativeElement;
            const mainHeaders = hierarchicalGrid.nativeElement
                .querySelectorAll('igx-grid-header[ng-reflect-grid-i-d="' + hierarchicalGrid.id + '"]');

            const childHeaderX = childHeader.getBoundingClientRect().x + childHeader.getBoundingClientRect().width / 2;
            const childHeaderY = childHeader.getBoundingClientRect().y + childHeader.getBoundingClientRect().height / 2;
            const mainHeaderX = mainHeaders[0].getBoundingClientRect().x + mainHeaders[0].getBoundingClientRect().width / 2;
            const mainHeaderY = mainHeaders[0].getBoundingClientRect().y + mainHeaders[0].getBoundingClientRect().height / 2;

            UIInteractions.simulatePointerEvent('pointerdown', childHeader, childHeaderX, childHeaderY);
            await wait();
            fixture.detectChanges();
            UIInteractions.simulatePointerEvent('pointermove', childHeader, childHeaderX, childHeaderY - 10);
            await wait(100);
            fixture.detectChanges();
            UIInteractions.simulatePointerEvent('pointermove', childHeader, mainHeaderX + 50, mainHeaderY);
            await wait(100);
            fixture.detectChanges();

            // The moving indicator shouldn't show that a column can be moved.
            const childGroupHeader = childGrids[0].query(By.css('igx-grid-header')).injector.get(IgxColumnMovingDragDirective);
            const dragElem = childGroupHeader.ghostElement;
            const dragIcon = dragElem.querySelector('i');
            expect(dragElem).toBeDefined();
            expect(dragIcon.innerText.trim()).toEqual('block');

            UIInteractions.simulatePointerEvent('pointerup', childHeader, mainHeaderX + 50, mainHeaderY);
            await wait();
            fixture.detectChanges();

            expect(hierarchicalGrid.columnList.length).toEqual(4);
            expect(mainHeaders.length).toEqual(3);
            expect(mainHeaders[0].children[0].innerText.trim()).toEqual('ID');
            expect(mainHeaders[1].children[0].innerText.trim()).toEqual('ChildLevels');
            expect(mainHeaders[2].children[0].innerText.trim()).toEqual('ProductName');
        }));
    });

    describe('Pinning', () => {
        it('should be possible by templating the header and getting column reference for child grid', (async() => {
            hierarchicalGrid = fixture.componentInstance.hgrid;
            (hierarchicalGrid.dataRowList.toArray()[0].nativeElement.children[0] as HTMLElement).click();
            fixture.detectChanges();

            const childGrids =  fixture.debugElement.queryAll(By.css('igx-child-grid-row'));
            const childGrid = childGrids[0].query(By.css('igx-hierarchical-grid')).componentInstance;
            let headers = childGrid.nativeElement.querySelectorAll('igx-grid-header-group');
            const firstHeaderIcon = headers[0].querySelector('igx-icon');

            expect(headers[0].classList.contains('igx-grid__th--pinned')).toBeFalsy();
            expect(childGrid.columnList.toArray()[0].pinned).toBeFalsy();
            expect(firstHeaderIcon).toBeTruthy();

            firstHeaderIcon.click();
            await wait();
            fixture.detectChanges();

            headers = childGrid.nativeElement.querySelectorAll('igx-grid-header-group');
            expect(childGrid.columnList.toArray()[0].pinned).toBeTruthy();
            expect(headers[0].classList.contains('igx-grid__th--pinned')).toBeTruthy();
        }));

        it('should be applied correctly for child grid with multi-column header.', (() => {
            const ri = fixture.componentInstance.rowIsland;
            const col = ri.columnList.find(x => x.header === 'Information');
            col.pinned = true;
            fixture.detectChanges();

            const row = hierarchicalGrid.getRowByIndex(0) as IgxHierarchicalRowComponent;
            UIInteractions.clickElement(row.expander);
            fixture.detectChanges();

            const childGrids =  fixture.debugElement.queryAll(By.css('igx-child-grid-row'));
            const childGrid = childGrids[0].query(By.css('igx-hierarchical-grid')).componentInstance;
            // check unpinned/pinned columns
            expect(childGrid.pinnedColumns.length).toBe(3);
            expect(childGrid.unpinnedColumns.length).toBe(1);
             // check cells
            const cells = childGrid.getRowByIndex(0).cells;
            expect(cells.length).toBe(3);
            let cell = childGrid.getCellByColumn(0, 'ChildLevels');
            expect(cell.visibleColumnIndex).toEqual(0);
            expect(cell.nativeElement.classList.contains('igx-grid__td--pinned')).toBe(true);
            cell = childGrid.getCellByColumn(0, 'ProductName');
            expect(cell.visibleColumnIndex).toEqual(1);
            expect(cell.nativeElement.classList.contains('igx-grid__td--pinned')).toBe(true);
            cell = childGrid.getCellByColumn(0, 'ID');
            expect(cell.visibleColumnIndex).toEqual(2);
            expect(cell.nativeElement.classList.contains('igx-grid__td--pinned')).toBe(false);
        }));
    });
});

@Component({
    template: `
    <igx-hierarchical-grid #grid1 [data]="data" [allowFiltering]="true" [rowEditable]="true"
     [height]="'600px'" [width]="'700px'" #hierarchicalGrid [primaryKey]="'ID'">
        <igx-column field="ID" [groupable]='true' [movable]='true'></igx-column>
        <igx-column-group header="Information">
                <igx-column field="ChildLevels" [groupable]='true' [sortable]='true' [editable]="true" [movable]='true'></igx-column>
                <igx-column field="ProductName" [groupable]='true' [hasSummary]='true' [movable]='true'></igx-column>
        </igx-column-group>
        <igx-row-island [key]="'childData'" #rowIsland [allowFiltering]="true" [rowEditable]="true"
            [primaryKey]="'ID'" [showToolbar]="true" [columnHiding]="true" [columnPinning]="true">
            <igx-column field="ID" [groupable]='true' [hasSummary]='true' [movable]='true'>
                <ng-template igxHeader let-columnRef="column">
                    <div>
                        <span>ID</span>
                        <igx-icon fontSet="material" (click)="pinColumn(columnRef)">lock</igx-icon>
                    </div>
                </ng-template>
            </igx-column>
            <igx-column-group header="Information">
                    <igx-column field="ChildLevels" [groupable]='true' [sortable]='true' [editable]="true"></igx-column>
                    <igx-column field="ProductName" [groupable]='true'></igx-column>
            </igx-column-group>
            <igx-row-island [key]="'childData'" #rowIsland2 >
                <igx-column field="ID" [groupable]='true' ></igx-column>
                <igx-column-group header="Information">
                        <igx-column field="ChildLevels" [groupable]='true' [sortable]='true' [editable]="true"></igx-column>
                        <igx-column field="ProductName" [groupable]='true' [hasSummary]='true'></igx-column>
                </igx-column-group>
            </igx-row-island>
        </igx-row-island>
    </igx-hierarchical-grid>`,
    providers: [ IgxHierarchicalTransactionServiceFactory ]
})
export class IgxHierarchicalGridTestBaseComponent {
    public data;
    @ViewChild('hierarchicalGrid', { read: IgxHierarchicalGridComponent, static: true }) public hgrid: IgxHierarchicalGridComponent;
    @ViewChild('rowIsland', { read: IgxRowIslandComponent, static: true }) public rowIsland: IgxRowIslandComponent;
    @ViewChild('rowIsland2', { read: IgxRowIslandComponent, static: true }) public rowIsland2: IgxRowIslandComponent;

    constructor() {
        // 3 level hierarchy
        this.data = this.generateData(40, 3);
    }
    generateData(count: number, level: number, parendID?) {
        const prods = [];
        const currLevel = level;
        let children;
        for (let i = 0; i < count; i++) {
            const rowID = parendID ? parendID + i : i.toString();
           if (level > 0 ) {
                children = this.generateData(count / 2 , currLevel - 1, rowID);
           }
           prods.push({
            ID: rowID, ChildLevels: currLevel,  ProductName: 'Product: A' + i, 'Col1': i,
            'Col2': i, 'Col3': i, childData: children, childData2: children });
        }
        return prods;
    }

    pinColumn(column: IgxColumnComponent) {
        column.pinned ? column.unpin() : column.pin();
    }
}

@Component({
    template: `
    <igx-hierarchical-grid #grid1 [data]="data" [height]="'600px'" [width]="'700px'" #hierarchicalGrid
        [primaryKey]="'ID'" [showToolbar]="true" [autoGenerate]="true">
        <igx-row-island [key]="'childData1'" #rowIsland1 [primaryKey]="'ID'" [showToolbar]="true" [autoGenerate]="true">
            <ng-template igxToolbarCustomContent>
                <button igxButton="raised">Child 1 Button</button>
            </ng-template>
        </igx-row-island>
        <igx-row-island [key]="'childData2'" #rowIsland2 [primaryKey]="'ID'" [showToolbar]="true" [autoGenerate]="true">
            <ng-template igxToolbarCustomContent>
                <button igxButton="raised">Child 2 Button</button>
            </ng-template>
        </igx-row-island>
        <ng-template igxToolbarCustomContent>
            <button igxButton="raised">Parent Button</button>
        </ng-template>
    </igx-hierarchical-grid>`
})
export class IgxHierarchicalGridTestCustomToolbarComponent {
    public data;
    @ViewChild('hierarchicalGrid', { read: IgxHierarchicalGridComponent, static: true }) public hgrid: IgxHierarchicalGridComponent;
    @ViewChild('rowIsland1', { read: IgxRowIslandComponent, static: true }) public rowIsland: IgxRowIslandComponent;
    @ViewChild('rowIsland2', { read: IgxRowIslandComponent, static: true }) public rowIsland2: IgxRowIslandComponent;

    constructor() {
        this.data = this.generateData(10, 2);
    }
    generateData(count: number, level: number, parendID?) {
        const prods = [];
        const currLevel = level;
        let children;
        for (let i = 0; i < count; i++) {
            const rowID = parendID ? parendID + i : i.toString();
           if (level > 0 ) {
                children = this.generateData(count / 2 , currLevel - 1, rowID);
           }
           prods.push({
            ID: rowID, ChildLevels: currLevel,  ProductName: 'Product: A' + i, 'Col1': i,
            'Col2': i, 'Col3': i, childData1: children, childData2: children });
        }
        return prods;
    }
}
