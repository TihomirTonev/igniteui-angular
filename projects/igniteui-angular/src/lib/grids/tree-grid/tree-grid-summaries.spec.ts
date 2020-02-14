import { async, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { IgxTreeGridModule } from './index';
import {
    IgxTreeGridSummariesComponent,
    IgxTreeGridSummariesKeyComponent,
    IgxTreeGridCustomSummariesComponent,
    IgxTreeGridSummariesTransactionsComponent,
    IgxTreeGridSummariesScrollingComponent,
    IgxTreeGridSummariesKeyScroliingComponent
} from '../../test-utils/tree-grid-components.spec';
import { configureTestSuite } from '../../test-utils/configure-suite';
import { setupGridScrollDetection } from '../../test-utils/helper-utils.spec';
import { wait, UIInteractions } from '../../test-utils/ui-interactions.spec';
import { IgxTreeGridRowComponent } from './tree-grid-row.component';
import { GridSummaryFunctions } from '../../test-utils/grid-functions.spec';
import { IgxNumberFilteringOperand } from '../../data-operations/filtering-condition';

describe('IgxTreeGrid - Summaries #tGrid', () => {
    configureTestSuite();
    const DEBOUNCETIME = 30;

    beforeAll(async(() => {
        TestBed.configureTestingModule({
            declarations: [
                IgxTreeGridSummariesComponent,
                IgxTreeGridSummariesKeyComponent,
                IgxTreeGridCustomSummariesComponent,
                IgxTreeGridSummariesTransactionsComponent,
                IgxTreeGridSummariesScrollingComponent,
                IgxTreeGridSummariesKeyScroliingComponent
            ],
            imports: [
                BrowserAnimationsModule,
                IgxTreeGridModule]
        })
            .compileComponents();
    }));

    describe('', () => {
        let fix;
        let treeGrid;
        beforeEach(async(/** height/width setter rAF */() => {
            fix = TestBed.createComponent(IgxTreeGridSummariesKeyComponent);
            fix.detectChanges();
            treeGrid = fix.componentInstance.treeGrid;
            setupGridScrollDetection(fix, treeGrid);
        }));

        it('should render summaries for all the rows when have parentKey', () => {
            verifyTreeBaseSummaries(fix);
            expect(GridSummaryFunctions.getAllVisibleSummariesLength(fix)).toEqual(1);
            // Expand second row and verify summaries
            treeGrid.toggleRow(treeGrid.getRowByIndex(1).rowID);
            fix.detectChanges();

            verifyTreeBaseSummaries(fix);
            verifySummaryForRow847(fix, 4);
            expect(GridSummaryFunctions.getAllVisibleSummariesLength(fix)).toEqual(2);

            // Expand child row and verify summaries
            treeGrid.toggleRow(treeGrid.getRowByIndex(3).rowID);
            fix.detectChanges();

            expect(GridSummaryFunctions.getAllVisibleSummariesLength(fix)).toEqual(3);

            verifyTreeBaseSummaries(fix);
            verifySummaryForRow663(fix, 5);
            verifySummaryForRow847(fix, 6);
        });

        it('should render summaries on top when position is top ', () => {
            treeGrid.summaryPosition = 'top';
            fix.detectChanges();

            verifyTreeBaseSummaries(fix);
            expect(GridSummaryFunctions.getAllVisibleSummariesLength(fix)).toEqual(1);
            // Expand first row and verify summaries
            treeGrid.toggleRow(treeGrid.getRowByIndex(0).rowID);
            fix.detectChanges();

            verifyTreeBaseSummaries(fix);
            verifySummaryForRow147(fix, 1);
            expect(GridSummaryFunctions.getAllVisibleSummariesLength(fix)).toEqual(2);

            // Expand second row and verify summaries
            treeGrid.toggleRow(treeGrid.getRowByIndex(5).rowID);
            fix.detectChanges();

            verifyTreeBaseSummaries(fix);
            verifySummaryForRow847(fix, 6);
            expect(GridSummaryFunctions.getAllVisibleSummariesLength(fix)).toEqual(3);

            // Expand first row child and verify summaries
            treeGrid.toggleRow(treeGrid.getRowByIndex(4).rowID);
            fix.detectChanges();

            verifySummaryForRow317(fix, 5);
            expect(GridSummaryFunctions.getAllVisibleSummariesLength(fix)).toEqual(4);
        });

        it('should be able to change summaryPosition at runtime', () => {
            treeGrid.expandAll();
            fix.detectChanges();

            verifyTreeBaseSummaries(fix);
            expect(GridSummaryFunctions.getAllVisibleSummariesLength(fix)).toEqual(3);
            expect(GridSummaryFunctions.getAllVisibleSummariesRowIndexes(fix)).toEqual([0, 6, 7]);

            treeGrid.summaryPosition = 'top';
            fix.detectChanges();

            verifyTreeBaseSummaries(fix);
            expect(GridSummaryFunctions.getAllVisibleSummariesLength(fix)).toEqual(4);

            expect(GridSummaryFunctions.getAllVisibleSummariesRowIndexes(fix)).toEqual([0, 1, 5, 9]);

            treeGrid.summaryPosition = 'bottom';
            fix.detectChanges();

            expect(GridSummaryFunctions.getAllVisibleSummariesLength(fix)).toEqual(3);

            expect(GridSummaryFunctions.getAllVisibleSummariesRowIndexes(fix)).toEqual([0, 6, 7]);
        });

        it('should be able to change summaryCalculationMode at runtime', async () => {
            treeGrid.expandAll();
            fix.detectChanges();

            verifyTreeBaseSummaries(fix);
            expect(GridSummaryFunctions.getAllVisibleSummariesLength(fix)).toEqual(3);

            expect(GridSummaryFunctions.getAllVisibleSummariesRowIndexes(fix)).toEqual([0, 6, 7]);

            treeGrid.summaryCalculationMode = 'rootLevelOnly';
            fix.detectChanges();
            await wait(50);

            verifyTreeBaseSummaries(fix);
            expect(GridSummaryFunctions.getAllVisibleSummariesLength(fix)).toEqual(1);

            treeGrid.summaryCalculationMode = 'childLevelsOnly';
            fix.detectChanges();
            await wait(50);

            expect(GridSummaryFunctions.getAllVisibleSummariesLength(fix)).toEqual(4);
            expect(GridSummaryFunctions.getAllVisibleSummariesRowIndexes(fix)).toEqual([6, 7, 12, 13]);
            const summaryRow = GridSummaryFunctions.getSummaryRowByDataRowIndex(fix, 0);
            expect(summaryRow).toBeNull();

            treeGrid.summaryCalculationMode = 'rootAndChildLevels';
            fix.detectChanges();
            await wait(50);

            verifyTreeBaseSummaries(fix);
            expect(GridSummaryFunctions.getAllVisibleSummariesLength(fix)).toEqual(3);
            expect(GridSummaryFunctions.getAllVisibleSummariesRowIndexes(fix)).toEqual([0, 6, 7]);
        });

        it('should be able to enable/disable summaries at runtime', () => {
            treeGrid.expandAll();
            fix.detectChanges();

            treeGrid.getColumnByName('Age').hasSummary = false;
            fix.detectChanges();

            GridSummaryFunctions.verifyVisibleSummariesHeight(fix, 3);

            let summaries = GridSummaryFunctions.getAllVisibleSummaries(fix);
            summaries.forEach(summary => {
                GridSummaryFunctions.verifyColumnSummaries(summary, 0, [], []);
                GridSummaryFunctions.verifyColumnSummaries(summary, 1, ['Count'], []);
                GridSummaryFunctions.verifyColumnSummaries(summary, 2, ['Count', 'Earliest', 'Latest'], []);
                GridSummaryFunctions.verifyColumnSummaries(summary, 3, [], []);
                GridSummaryFunctions.verifyColumnSummaries(summary, 4, ['Count'], []);
            });

            // Disable all summaries
            treeGrid.getColumnByName('Name').hasSummary = false;
            treeGrid.getColumnByName('HireDate').hasSummary = false;
            treeGrid.getColumnByName('OnPTO').hasSummary = false;
            fix.detectChanges();
            expect(GridSummaryFunctions.getAllVisibleSummariesLength(fix)).toEqual(0);

            treeGrid.collapseAll();
            fix.detectChanges();

            treeGrid.getColumnByName('Name').hasSummary = true;
            fix.detectChanges();

            treeGrid.toggleRow(treeGrid.getRowByIndex(0).rowID);
            fix.detectChanges();

            expect(GridSummaryFunctions.getAllVisibleSummariesLength(fix)).toEqual(2);
            summaries = GridSummaryFunctions.getAllVisibleSummaries(fix);
            summaries.forEach(summary => {
                GridSummaryFunctions.verifyColumnSummaries(summary, 0, [], []);
                GridSummaryFunctions.verifyColumnSummaries(summary, 1, ['Count'], []);
                GridSummaryFunctions.verifyColumnSummaries(summary, 2, [], []);
                GridSummaryFunctions.verifyColumnSummaries(summary, 3, [], []);
                GridSummaryFunctions.verifyColumnSummaries(summary, 4, [], []);
            });
            GridSummaryFunctions.verifyVisibleSummariesHeight(fix, 1);
        });

        it('should be able to enable/disable summaries with API', () => {
            treeGrid.disableSummaries([{ fieldName: 'Age' }, { fieldName: 'HireDate' }]);
            fix.detectChanges();

            GridSummaryFunctions.verifyVisibleSummariesHeight(fix, 1);

            treeGrid.toggleRow(treeGrid.getRowByIndex(0).rowID);
            fix.detectChanges();

            let summaries = GridSummaryFunctions.getAllVisibleSummaries(fix);
            summaries.forEach(summary => {
                GridSummaryFunctions.verifyColumnSummaries(summary, 0, [], []);
                GridSummaryFunctions.verifyColumnSummaries(summary, 1, ['Count'], []);
                GridSummaryFunctions.verifyColumnSummaries(summary, 2, [], []);
                GridSummaryFunctions.verifyColumnSummaries(summary, 3, [], []);
                GridSummaryFunctions.verifyColumnSummaries(summary, 4, ['Count'], []);
            });

            GridSummaryFunctions.verifyVisibleSummariesHeight(fix, 1);

            treeGrid.disableSummaries('Name');
            treeGrid.disableSummaries('OnPTO');
            fix.detectChanges();

            expect(GridSummaryFunctions.getAllVisibleSummariesLength(fix)).toEqual(0);

            treeGrid.enableSummaries('HireDate');
            fix.detectChanges();

            expect(GridSummaryFunctions.getAllVisibleSummariesLength(fix)).toEqual(2);

            GridSummaryFunctions.verifyVisibleSummariesHeight(fix, 3);

            summaries = GridSummaryFunctions.getAllVisibleSummaries(fix);
            summaries.forEach(summary => {
                GridSummaryFunctions.verifyColumnSummaries(summary, 0, [], []);
                GridSummaryFunctions.verifyColumnSummaries(summary, 1, [], []);
                GridSummaryFunctions.verifyColumnSummaries(summary, 2, ['Count', 'Earliest', 'Latest'], []);
                GridSummaryFunctions.verifyColumnSummaries(summary, 3, [], []);
                GridSummaryFunctions.verifyColumnSummaries(summary, 4, [], []);
            });

            let summaryRow = GridSummaryFunctions.getSummaryRowByDataRowIndex(fix, 4);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 2,
                ['Count', 'Earliest', 'Latest'], ['3', 'Jul 19, 2009', 'Sep 18, 2014']);

            treeGrid.enableSummaries([{ fieldName: 'Age' }, { fieldName: 'ID' }]);
            fix.detectChanges();

            GridSummaryFunctions.verifyVisibleSummariesHeight(fix, 5);

            summaries = GridSummaryFunctions.getAllVisibleSummaries(fix);
            summaries.forEach(summary => {
                GridSummaryFunctions.verifyColumnSummaries(summary, 0, ['Count', 'Min', 'Max', 'Sum', 'Avg'], []);
                GridSummaryFunctions.verifyColumnSummaries(summary, 1, [], []);
                GridSummaryFunctions.verifyColumnSummaries(summary, 2, ['Count', 'Earliest', 'Latest'], []);
                GridSummaryFunctions.verifyColumnSummaries(summary, 3, ['Count', 'Min', 'Max', 'Sum', 'Avg'], []);
                GridSummaryFunctions.verifyColumnSummaries(summary, 4, [], []);
            });

            summaryRow = GridSummaryFunctions.getSummaryRowByDataRowIndex(fix, 4);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 3,
                ['Count', 'Min', 'Max', 'Sum', 'Avg'], ['3', '29', '43', '103', '34.333']);

            summaryRow = GridSummaryFunctions.getSummaryRowByDataRowIndex(fix, 0);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 3,
                ['Count', 'Min', 'Max', 'Sum', 'Avg'], ['4', '42', '61', '207', '51.75']);
        });

        it('should be able to change summary operant at runtime', () => {
            treeGrid.expandAll();
            fix.detectChanges();

            GridSummaryFunctions.verifyVisibleSummariesHeight(fix, 5);

            treeGrid.getColumnByName('Age').summaries = fix.componentInstance.ageSummaryTest;
            fix.detectChanges();

            GridSummaryFunctions.verifyVisibleSummariesHeight(fix, 6);

            let summaryRow = GridSummaryFunctions.getSummaryRowByDataRowIndex(fix, 7);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 3,
                ['Count', 'Min', 'Max', 'Sum', 'Avg', 'Test'], ['3', '29', '43', '103', '34.333', '2']);

            summaryRow = GridSummaryFunctions.getSummaryRowByDataRowIndex(fix, 6);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 3,
                ['Count', 'Min', 'Max', 'Sum', 'Avg', 'Test'], ['2', '35', '44', '79', '39.5', '1']);

            summaryRow = GridSummaryFunctions.getSummaryRowByDataRowIndex(fix, 0);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 3,
                ['Count', 'Min', 'Max', 'Sum', 'Avg', 'Test'], ['4', '42', '61', '207', '51.75', '0']);
        });

        it('should be able to change summary operant with API', () => {
            treeGrid.expandAll();
            fix.detectChanges();

            GridSummaryFunctions.verifyVisibleSummariesHeight(fix, 5);

            treeGrid.enableSummaries([{ fieldName: 'Age', customSummary: fix.componentInstance.ageSummary }]);
            fix.detectChanges();

            GridSummaryFunctions.verifyVisibleSummariesHeight(fix, 3);

            let summaryRow = GridSummaryFunctions.getSummaryRowByDataRowIndex(fix, 7);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 3, ['Count', 'Sum', 'Avg'], ['3', '103', '34.33']);

            summaryRow = GridSummaryFunctions.getSummaryRowByDataRowIndex(fix, 6);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 3, ['Count', 'Sum', 'Avg'], ['2', '79', '39.5']);

            summaryRow = GridSummaryFunctions.getSummaryRowByDataRowIndex(fix, 0);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 3, ['Count', 'Sum', 'Avg'], ['4', '207', '51.75']);
        });

        it('Hiding: should render correct summaries when show/hide a colomn', () => {
            treeGrid.expandAll();
            fix.detectChanges();

            treeGrid.getColumnByName('Age').hidden = true;
            fix.detectChanges();

            let summaries = GridSummaryFunctions.getAllVisibleSummaries(fix);
            summaries.forEach(summary => {
                GridSummaryFunctions.verifyColumnSummaries(summary, 0, [], []);
                GridSummaryFunctions.verifyColumnSummaries(summary, 1, ['Count'], []);
                GridSummaryFunctions.verifyColumnSummaries(summary, 2, ['Count', 'Earliest', 'Latest'], []);
                GridSummaryFunctions.verifyColumnSummaries(summary, 3, ['Count'], []);
            });

            GridSummaryFunctions.verifyVisibleSummariesHeight(fix, 3);

            treeGrid.getColumnByName('Name').hidden = true;
            treeGrid.getColumnByName('HireDate').hidden = true;
            treeGrid.getColumnByName('OnPTO').hidden = true;
            fix.detectChanges();
            expect(GridSummaryFunctions.getAllVisibleSummariesLength(fix)).toEqual(0);

            treeGrid.getColumnByName('HireDate').hidden = false;
            treeGrid.getColumnByName('OnPTO').hidden = false;
            fix.detectChanges();

            summaries = GridSummaryFunctions.getAllVisibleSummaries(fix);
            summaries.forEach(summary => {
                GridSummaryFunctions.verifyColumnSummaries(summary, 0, [], []);
                GridSummaryFunctions.verifyColumnSummaries(summary, 1, ['Count', 'Earliest', 'Latest'], []);
                GridSummaryFunctions.verifyColumnSummaries(summary, 2, ['Count'], []);
            });

            GridSummaryFunctions.verifyVisibleSummariesHeight(fix, 3);

            let summaryRow = GridSummaryFunctions.getSummaryRowByDataRowIndex(fix, 7);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 2, ['Count'], ['3']);

            summaryRow = GridSummaryFunctions.getSummaryRowByDataRowIndex(fix, 6);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 2, ['Count'], ['2']);

            summaryRow = GridSummaryFunctions.getSummaryRowByDataRowIndex(fix, 0);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 2, ['Count'], ['4']);
        });

        it('Filtering: should render correct summaries when filter and found only children', fakeAsync(() => {
            treeGrid.filter('ID', 12, IgxNumberFilteringOperand.instance().condition('lessThanOrEqualTo'));
            fix.detectChanges();

            expect(GridSummaryFunctions.getAllVisibleSummariesLength(fix)).toEqual(2);
            let summaryRow = GridSummaryFunctions.getSummaryRowByDataRowIndex(fix, 2);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 1, ['Count'], ['1']);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 2,
                ['Count', 'Earliest', 'Latest'], ['1', 'Dec 18, 2007', 'Dec 18, 2007']);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 3, ['Count', 'Min', 'Max', 'Sum', 'Avg'], ['1', '50', '50', '50', '50']);

            summaryRow = GridSummaryFunctions.getSummaryRowByDataRowIndex(fix, 0);
            verifySummaryIsEmpty(summaryRow);
        }));

        it('Filtering: should render correct summaries when filter and no results are found', fakeAsync(() => {
            treeGrid.filter('ID', 0, IgxNumberFilteringOperand.instance().condition('lessThanOrEqualTo'));
            fix.detectChanges();

            expect(GridSummaryFunctions.getAllVisibleSummariesLength(fix)).toEqual(1);
            const summaryRow = GridSummaryFunctions.getSummaryRowByDataRowIndex(fix, 0);
            verifySummaryIsEmpty(summaryRow);
        }));

        it('Filtering: should render correct summaries when filter', fakeAsync(() => {
            treeGrid.filter('ID', 17, IgxNumberFilteringOperand.instance().condition('lessThanOrEqualTo'));
            fix.detectChanges();

            expect(GridSummaryFunctions.getAllVisibleSummariesLength(fix)).toEqual(3);

            let summaryRow = GridSummaryFunctions.getSummaryRowByDataRowIndex(fix, 5);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 1, ['Count'], ['1']);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 2,
                ['Count', 'Earliest', 'Latest'], ['1', 'Dec 18, 2007', 'Dec 18, 2007']);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 3, ['Count', 'Min', 'Max', 'Sum', 'Avg'], ['1', '50', '50', '50', '50']);

            summaryRow = GridSummaryFunctions.getSummaryRowByDataRowIndex(fix, 2);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 1, ['Count'], ['1']);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 2, ['Count', 'Earliest', 'Latest'], ['1', 'May 4, 2014', 'May 4, 2014']);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 3, ['Count', 'Min', 'Max', 'Sum', 'Avg'], ['1', '44', '44', '44', '44']);

            summaryRow = GridSummaryFunctions.getSummaryRowByDataRowIndex(fix, 0);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 1, ['Count'], ['1']);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 3, ['Count', 'Min', 'Max', 'Sum', 'Avg'], ['1', '61', '61', '61', '61']);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 2, ['Count', 'Earliest', 'Latest'], ['1', 'Feb 1, 2010', 'Feb 1, 2010']);
        }));

        it('Paging: should render correct summaries when paging is enable and position is bottom', fakeAsync(() => {
            treeGrid.paging = true;
            treeGrid.perPage = 4;
            fix.detectChanges();
            tick(16);

            expect(GridSummaryFunctions.getAllVisibleSummariesLength(fix)).toEqual(1);
            verifyTreeBaseSummaries(fix);

            treeGrid.toggleRow(treeGrid.getRowByIndex(0).rowID);
            fix.detectChanges();
            tick(16);

            expect(GridSummaryFunctions.getAllVisibleSummariesLength(fix)).toEqual(2);
            verifyTreeBaseSummaries(fix);
            verifySummaryForRow147(fix, 4);

            treeGrid.toggleRow(treeGrid.getRowByIndex(3).rowID);
            fix.detectChanges();
            tick(16);

            expect(GridSummaryFunctions.getAllVisibleSummariesLength(fix)).toEqual(1);

            treeGrid.page = 1;
            fix.detectChanges();
            tick(16);

            expect(GridSummaryFunctions.getAllVisibleSummariesLength(fix)).toEqual(3);
            verifyTreeBaseSummaries(fix);
            verifySummaryForRow147(fix, 3);
            verifySummaryForRow317(fix, 2);
        }));

        it('Paging: should render correct summaries when paging is enable and position is top', fakeAsync(() => {
            treeGrid.paging = true;
            treeGrid.perPage = 4;
            treeGrid.summaryPosition = 'top';
            fix.detectChanges();
            tick(16);

            expect(GridSummaryFunctions.getAllVisibleSummariesLength(fix)).toEqual(1);
            verifyTreeBaseSummaries(fix);

            treeGrid.toggleRow(treeGrid.getRowByIndex(0).rowID);
            fix.detectChanges();

            expect(GridSummaryFunctions.getAllVisibleSummariesLength(fix)).toEqual(2);
            verifyTreeBaseSummaries(fix);
            verifySummaryForRow147(fix, 1);

            treeGrid.toggleRow(treeGrid.getRowByIndex(4).rowID);
            fix.detectChanges();

            expect(GridSummaryFunctions.getAllVisibleSummariesLength(fix)).toEqual(3);
            verifySummaryForRow317(fix, 5);
            verifySummaryForRow147(fix, 1);

            treeGrid.page = 1;
            fix.detectChanges();
            tick(16);

            expect(GridSummaryFunctions.getAllVisibleSummariesLength(fix)).toEqual(1);
            verifyTreeBaseSummaries(fix);

            treeGrid.toggleRow(treeGrid.getRowByIndex(2).rowID);
            fix.detectChanges();

            expect(GridSummaryFunctions.getAllVisibleSummariesLength(fix)).toEqual(2);
            verifySummaryForRow847(fix, 3);
        }));

        it('CRUD: Add root node', () => {
            treeGrid.expandAll();
            fix.detectChanges();

            const newRow = {
                ID: 777,
                ParentID: -1,
                Name: 'New Employee',
                HireDate: new Date(2019, 3, 3),
                Age: 19
            };
            treeGrid.addRow(newRow);
            fix.detectChanges();

            const summaryRow = GridSummaryFunctions.getSummaryRowByDataRowIndex(fix, 0);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 1, ['Count'], ['5']);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 2,
                ['Count', 'Earliest', 'Latest'], ['5', 'Apr 20, 2008', 'Apr 3, 2019']);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 3,
                ['Count', 'Min', 'Max', 'Sum', 'Avg'], ['5', '19', '61', '226', '45.2']);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 4, ['Count'], ['5']);

            verifySummaryForRow147(fix, 7);
        });

        it('CRUD: Add child node', () => {
            treeGrid.expandAll();
            fix.detectChanges();

            const newRow = {
                ID: 777,
                ParentID: 147,
                Name: 'New Employee',
                HireDate: new Date(2019, 3, 3),
                Age: 19
            };
            treeGrid.addRow(newRow);
            fix.detectChanges();

            const summaryRow = GridSummaryFunctions.getSummaryRowByDataRowIndex(fix, 8);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 1, ['Count'], ['4']);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 2,
                ['Count', 'Earliest', 'Latest'], ['4', 'Jul 19, 2009', 'Apr 3, 2019']);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 4, ['Count'], ['4']);

            verifyTreeBaseSummaries(fix);
        });

        it('CRUD: add child row whick contains null or undefined values', () => {
            treeGrid.expandAll();
            fix.detectChanges();

            const newRow = {
                ID: 777,
                ParentID: 475,
                Name: 'New Employee',
                HireDate: undefined,
                Age: null
            };
            expect(() => {
                treeGrid.addRow(newRow);
                fix.detectChanges();
            }).not.toThrow();

            const summaryRow = GridSummaryFunctions.getSummaryRowByDataRowIndex(fix, 3);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 1, ['Count'], ['1']);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 2, ['Count', 'Earliest', 'Latest'], ['1', '', '']);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 3, ['Count', 'Min', 'Max', 'Sum', 'Avg'], ['1', '0', '0', '0', '0']);

            verifyTreeBaseSummaries(fix);
        });

        it('CRUD: delete root node', () => {
            treeGrid.expandAll();
            fix.detectChanges();

            treeGrid.deleteRow(treeGrid.getRowByIndex(0).rowID);
            fix.detectChanges();

            const summaryRow = GridSummaryFunctions.getSummaryRowByDataRowIndex(fix, 0);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 1, ['Count'], ['3']);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 2,
                ['Count', 'Earliest', 'Latest'], ['3', 'Feb 1, 2010', 'Feb 22, 2014']);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 3,
                ['Count', 'Min', 'Max', 'Sum', 'Avg'], ['3', '42', '61', '152', '50.667']);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 4, ['Count'], ['3']);

            verifySummaryForRow847(fix, 5);
        });

        it('CRUD: delete all root nodes', () => {
            treeGrid.toggleRow(treeGrid.getRowByIndex(0).rowID);
            fix.detectChanges();

            treeGrid.toggleRow(treeGrid.getRowByIndex(5).rowID);
            fix.detectChanges();

            expect(GridSummaryFunctions.getAllVisibleSummariesLength(fix)).toEqual(3);

            treeGrid.deleteRow(treeGrid.getRowByIndex(5).rowID);
            fix.detectChanges();

            let summaryRow = GridSummaryFunctions.getSummaryRowByDataRowIndex(fix, 0);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 1, ['Count'], ['3']);
            expect(GridSummaryFunctions.getAllVisibleSummariesLength(fix)).toEqual(2);

            treeGrid.deleteRow(treeGrid.getRowByIndex(5).rowID);
            fix.detectChanges();

            summaryRow = GridSummaryFunctions.getSummaryRowByDataRowIndex(fix, 0);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 1, ['Count'], ['2']);

            treeGrid.deleteRow(treeGrid.getRowByIndex(5).rowID);
            fix.detectChanges();

            summaryRow = GridSummaryFunctions.getSummaryRowByDataRowIndex(fix, 0);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 1, ['Count'], ['1']);

            treeGrid.deleteRow(treeGrid.getRowByIndex(0).rowID);
            fix.detectChanges();

            expect(GridSummaryFunctions.getAllVisibleSummariesLength(fix)).toEqual(1);
            summaryRow = GridSummaryFunctions.getSummaryRowByDataRowIndex(fix, 0);
            verifySummaryIsEmpty(summaryRow);
        });

        it('CRUD: delete child node', () => {
            treeGrid.toggleRow(treeGrid.getRowByIndex(0).rowID);
            fix.detectChanges();

            treeGrid.toggleRow(treeGrid.getRowByIndex(3).rowID);
            fix.detectChanges();

            expect(GridSummaryFunctions.getAllVisibleSummariesLength(fix)).toEqual(3);

            treeGrid.deleteRow(treeGrid.getRowByIndex(3).rowID);
            fix.detectChanges();

            expect(GridSummaryFunctions.getAllVisibleSummariesLength(fix)).toEqual(2);
            verifyTreeBaseSummaries(fix);

            const summaryRow = GridSummaryFunctions.getSummaryRowByDataRowIndex(fix, 3);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 1, ['Count'], ['2']);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 2,
                ['Count', 'Earliest', 'Latest'], ['2', 'Jul 19, 2009', 'Jul 3, 2011']);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 3, ['Count', 'Min', 'Max', 'Sum', 'Avg'], ['2', '29', '43', '72', '36']);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 4, ['Count'], ['2']);

            treeGrid.deleteRow(treeGrid.getRowByIndex(2).rowID);
            fix.detectChanges();

            treeGrid.deleteRow(treeGrid.getRowByIndex(1).rowID);
            fix.detectChanges();

            expect(GridSummaryFunctions.getAllVisibleSummariesLength(fix)).toEqual(1);
            verifyTreeBaseSummaries(fix);
        });

        it('CRUD: Update root node', () => {
            const newRow = {
                ID: 147,
                ParentID: -1,
                Name: 'New Employee',
                HireDate: new Date(2019, 3, 3),
                Age: 19
            };
            treeGrid.getRowByKey(147).update(newRow);
            fix.detectChanges();

            const summaryRow = GridSummaryFunctions.getSummaryRowByDataRowIndex(fix, 0);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 0, [], []);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 1, ['Count'], ['4']);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 2, ['Count', 'Earliest', 'Latest'], ['4', 'Feb 1, 2010', 'Apr 3, 2019']);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 3,
                ['Count', 'Min', 'Max', 'Sum', 'Avg'], ['4', '19', '61', '171', '42.75']);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 4, ['Count'], ['4']);
        });

        it('CRUD: Update child node', () => {
            treeGrid.toggleRow(treeGrid.getRowByIndex(1).rowID);
            fix.detectChanges();

            treeGrid.toggleRow(treeGrid.getRowByIndex(3).rowID);
            fix.detectChanges();

            const newRow = {
                ID: 663,
                ParentID: 847,
                Name: 'New Employee',
                HireDate: new Date(2019, 3, 3),
                Age: 19
            };
            treeGrid.getRowByKey(663).update(newRow);
            fix.detectChanges();

            verifyTreeBaseSummaries(fix);

            let summaryRow = GridSummaryFunctions.getSummaryRowByDataRowIndex(fix, 6);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 0, [], []);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 1, ['Count'], ['2']);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 2, ['Count', 'Earliest', 'Latest'], ['2', 'May 4, 2014', 'Apr 3, 2019']);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 3,
                ['Count', 'Min', 'Max', 'Sum', 'Avg'], ['2', '19', '44', '63', '31.5']);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 4, ['Count'], ['2']);

            summaryRow = GridSummaryFunctions.getSummaryRowByDataRowIndex(fix, 5);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 0, [], []);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 1, ['Count'], ['1']);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 2,
                ['Count', 'Earliest', 'Latest'], ['1', 'Apr 22, 2010', 'Apr 22, 2010']);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 3, ['Count', 'Min', 'Max', 'Sum', 'Avg'], ['1', '39', '39', '39', '39']);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 4, ['Count'], ['1']);
        });
    });

    describe('CRUD with transactions', () => {
        let fix;
        let treeGrid;
        beforeEach(fakeAsync(/** height/width setter rAF */() => {
            fix = TestBed.createComponent(IgxTreeGridSummariesTransactionsComponent);
            fix.detectChanges();
            tick(16);
            treeGrid = fix.componentInstance.treeGrid;
            setupGridScrollDetection(fix, treeGrid);
            tick(16);
        }));

        it('Delete root node', () => {
            treeGrid.toggleRow(847);
            fix.detectChanges();

            treeGrid.deleteRow(847);
            fix.detectChanges();

            let summaryRow = GridSummaryFunctions.getSummaryRowByDataRowIndex(fix, 0);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 1, ['Count'], ['3']);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 3, ['Min', 'Max'], ['49', '61']);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 4, ['Count'], ['3']);

            summaryRow = GridSummaryFunctions.getSummaryRowByDataRowIndex(fix, 4);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 1, ['Count'], ['0']);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 3, ['Min', 'Max'], ['0', '0']);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 4, ['Count'], ['0']);

            // Undo transactions
            treeGrid.transactions.undo();
            fix.detectChanges();

            summaryRow = GridSummaryFunctions.getSummaryRowByDataRowIndex(fix, 0);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 1, ['Count'], ['4']);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 3, ['Min', 'Max'], ['42', '61']);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 4, ['Count'], ['4']);

            summaryRow = GridSummaryFunctions.getSummaryRowByDataRowIndex(fix, 4);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 1, ['Count'], ['2']);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 3, ['Min', 'Max'], ['25', '44']);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 4, ['Count'], ['2']);

            // Redo transactions
            treeGrid.transactions.redo();
            fix.detectChanges();

            summaryRow = GridSummaryFunctions.getSummaryRowByDataRowIndex(fix, 0);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 1, ['Count'], ['3']);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 3, ['Min', 'Max'], ['49', '61']);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 4, ['Count'], ['3']);

            summaryRow = GridSummaryFunctions.getSummaryRowByDataRowIndex(fix, 4);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 1, ['Count'], ['0']);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 3, ['Min', 'Max'], ['0', '0']);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 4, ['Count'], ['0']);

            // Commit transactions
            treeGrid.transactions.commit(fix.componentInstance.data);
            fix.detectChanges();

            expect(GridSummaryFunctions.getAllVisibleSummariesLength(fix)).toEqual(1);
            summaryRow = GridSummaryFunctions.getSummaryRowByDataRowIndex(fix, 0);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 1, ['Count'], ['3']);
        });

        it('Delete a root node with cascadeOnDelete set to false', () => {
            treeGrid.cascadeOnDelete = false;
            treeGrid.expandAll();
            fix.detectChanges();

            treeGrid.deleteRow(147);
            fix.detectChanges();

            // Verify summary is updated
            let summaryRow = GridSummaryFunctions.getSummaryRowByDataRowIndex(fix, 0);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 1, ['Count'], ['3']);

            summaryRow = GridSummaryFunctions.getSummaryRowByDataRowIndex(fix, 6);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 1, ['Count'], ['2']);

            summaryRow = GridSummaryFunctions.getSummaryRowByDataRowIndex(fix, 7);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 1, ['Count'], ['3']);

            // Commit transactions
            treeGrid.transactions.commit(fix.componentInstance.data);
            fix.detectChanges();

            summaryRow = GridSummaryFunctions.getSummaryRowByDataRowIndex(fix, 0);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 1, ['Count'], ['6']);

            summaryRow = GridSummaryFunctions.getSummaryRowByDataRowIndex(fix, 5);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 1, ['Count'], ['2']);
        });

        it('Delete child node', () => {
            treeGrid.deleteRow(317);
            fix.detectChanges();

            let summaryRow = GridSummaryFunctions.getSummaryRowByDataRowIndex(fix, 0);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 1, ['Count'], ['4']);

            treeGrid.expandAll();
            fix.detectChanges();

            summaryRow = GridSummaryFunctions.getSummaryRowByDataRowIndex(fix, 6);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 1, ['Count'], ['0']);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 3, ['Min', 'Max'], ['0', '0']);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 4, ['Count'], ['0']);

            summaryRow = GridSummaryFunctions.getSummaryRowByDataRowIndex(fix, 7);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 1, ['Count'], ['2']);

            // Undo transactions
            treeGrid.transactions.undo();
            fix.detectChanges();

            summaryRow = GridSummaryFunctions.getSummaryRowByDataRowIndex(fix, 0);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 1, ['Count'], ['4']);
            summaryRow = GridSummaryFunctions.getSummaryRowByDataRowIndex(fix, 6);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 1, ['Count'], ['2']);

            summaryRow = GridSummaryFunctions.getSummaryRowByDataRowIndex(fix, 7);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 1, ['Count'], ['3']);

            // Redo transactions
            treeGrid.transactions.redo();
            fix.detectChanges();

            summaryRow = GridSummaryFunctions.getSummaryRowByDataRowIndex(fix, 0);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 1, ['Count'], ['4']);

            summaryRow = GridSummaryFunctions.getSummaryRowByDataRowIndex(fix, 6);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 1, ['Count'], ['0']);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 3, ['Min', 'Max'], ['0', '0']);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 4, ['Count'], ['0']);

            summaryRow = GridSummaryFunctions.getSummaryRowByDataRowIndex(fix, 7);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 1, ['Count'], ['2']);

            // Clear transactions
            treeGrid.transactions.clear();
            fix.detectChanges();

            summaryRow = GridSummaryFunctions.getSummaryRowByDataRowIndex(fix, 0);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 1, ['Count'], ['4']);

            summaryRow = GridSummaryFunctions.getSummaryRowByDataRowIndex(fix, 6);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 1, ['Count'], ['2']);

            summaryRow = GridSummaryFunctions.getSummaryRowByDataRowIndex(fix, 7);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 1, ['Count'], ['3']);
        });

        it('Delete child node cascadeOnDelete set to false', () => {
            treeGrid.cascadeOnDelete = false;
            treeGrid.expandAll();
            fix.detectChanges();

            treeGrid.deleteRow(317);
            fix.detectChanges();

            // Verify summaries are not changed
            let summaryRow = GridSummaryFunctions.getSummaryRowByDataRowIndex(fix, 0);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 1, ['Count'], ['4']);

            summaryRow = GridSummaryFunctions.getSummaryRowByDataRowIndex(fix, 6);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 1, ['Count'], ['2']);

            summaryRow = GridSummaryFunctions.getSummaryRowByDataRowIndex(fix, 7);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 1, ['Count'], ['3']);

            // Commit
            treeGrid.transactions.commit(fix.componentInstance.data);
            fix.detectChanges();

            summaryRow = GridSummaryFunctions.getSummaryRowByDataRowIndex(fix, 0);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 1, ['Count'], ['6']);

            summaryRow = GridSummaryFunctions.getSummaryRowByDataRowIndex(fix, 3);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 1, ['Count'], ['2']);
        });

        it('Add root node', () => {
            const newRow = {
                ID: 11,
                ParentID: -1,
                Name: 'New Employee',
                HireDate: new Date(1984, 3, 3),
                Age: 70
            };
            treeGrid.addRow(newRow);
            fix.detectChanges();

            let summaryRow = GridSummaryFunctions.getSummaryRowByDataRowIndex(fix, 0);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 1, ['Count'], ['5']);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 3, ['Min', 'Max'], ['42', '70']);

            // Undo transactions
            treeGrid.transactions.undo();
            fix.detectChanges();

            summaryRow = GridSummaryFunctions.getSummaryRowByDataRowIndex(fix, 0);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 1, ['Count'], ['4']);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 3, ['Min', 'Max'], ['42', '61']);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 4, ['Count'], ['4']);

            // Redo transactions
            treeGrid.transactions.redo();
            fix.detectChanges();

            summaryRow = GridSummaryFunctions.getSummaryRowByDataRowIndex(fix, 0);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 1, ['Count'], ['5']);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 3, ['Min', 'Max'], ['42', '70']);

            // Commit transactions
            treeGrid.transactions.commit(fix.componentInstance.data);
            fix.detectChanges();

            expect(GridSummaryFunctions.getAllVisibleSummariesLength(fix)).toEqual(1);
            summaryRow = GridSummaryFunctions.getSummaryRowByDataRowIndex(fix, 0);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 1, ['Count'], ['5']);
        });

        it('Add child node', () => {
            const newRow = {
                ID: 11,
                ParentID: 317,
                Name: 'New Employee',
                HireDate: new Date(1984, 3, 3),
                Age: 70
            };
            treeGrid.addRow(newRow);
            fix.detectChanges();

            let summaryRow = GridSummaryFunctions.getSummaryRowByDataRowIndex(fix, 0);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 1, ['Count'], ['4']);

            treeGrid.expandAll();
            fix.detectChanges();

            summaryRow = GridSummaryFunctions.getSummaryRowByDataRowIndex(fix, 7);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 1, ['Count'], ['3']);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 3, ['Min', 'Max'], ['35', '70']);

            summaryRow = GridSummaryFunctions.getSummaryRowByDataRowIndex(fix, 8);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 1, ['Count'], ['3']);

            // Undo transactions
            treeGrid.transactions.undo();
            fix.detectChanges();

            summaryRow = GridSummaryFunctions.getSummaryRowByDataRowIndex(fix, 6);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 1, ['Count'], ['2']);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 3, ['Min', 'Max'], ['35', '44']);

            summaryRow = GridSummaryFunctions.getSummaryRowByDataRowIndex(fix, 7);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 1, ['Count'], ['3']);

            // Redo transactions
            treeGrid.transactions.redo();
            fix.detectChanges();

            summaryRow = GridSummaryFunctions.getSummaryRowByDataRowIndex(fix, 7);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 1, ['Count'], ['3']);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 3, ['Min', 'Max'], ['35', '70']);

            summaryRow = GridSummaryFunctions.getSummaryRowByDataRowIndex(fix, 8);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 1, ['Count'], ['3']);
        });

        it('Update root node', () => {
            const newRow = {
                ID: 847,
                ParentID: -1,
                Name: 'New Employee',
                HireDate: new Date(1984, 3, 3),
                Age: 13
            };
            treeGrid.updateRow(newRow, 847);
            fix.detectChanges();

            let summaryRow = GridSummaryFunctions.getSummaryRowByDataRowIndex(fix, 0);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 1, ['Count'], ['4']);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 3, ['Min', 'Max'], ['13', '61']);

            // Undo transactions
            treeGrid.transactions.undo();
            fix.detectChanges();

            summaryRow = GridSummaryFunctions.getSummaryRowByDataRowIndex(fix, 0);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 1, ['Count'], ['4']);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 3, ['Min', 'Max'], ['42', '61']);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 4, ['Count'], ['4']);

            // Redo transactions
            treeGrid.transactions.redo();
            fix.detectChanges();

            summaryRow = GridSummaryFunctions.getSummaryRowByDataRowIndex(fix, 0);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 1, ['Count'], ['4']);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 3, ['Min', 'Max'], ['13', '61']);

            // Commit transactions
            treeGrid.transactions.commit(fix.componentInstance.data);
            fix.detectChanges();

            expect(GridSummaryFunctions.getAllVisibleSummariesLength(fix)).toEqual(1);
            summaryRow = GridSummaryFunctions.getSummaryRowByDataRowIndex(fix, 0);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 1, ['Count'], ['4']);
        });

        it('Update child node', () => {
            const newRow = {
                ID: 317,
                ParentID: 147,
                Name: 'New Employee',
                HireDate: new Date(1984, 3, 3),
                Age: 13
            };
            treeGrid.updateRow(newRow, 317);
            fix.detectChanges();

            let summaryRow = GridSummaryFunctions.getSummaryRowByDataRowIndex(fix, 0);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 1, ['Count'], ['4']);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 3, ['Min', 'Max'], ['42', '61']);

            treeGrid.expandAll();
            fix.detectChanges();

            summaryRow = GridSummaryFunctions.getSummaryRowByDataRowIndex(fix, 6);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 1, ['Count'], ['2']);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 3, ['Min', 'Max'], ['35', '44']);

            summaryRow = GridSummaryFunctions.getSummaryRowByDataRowIndex(fix, 7);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 1, ['Count'], ['3']);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 3, ['Min', 'Max'], ['13', '43']);

            // Undo transactions
            treeGrid.transactions.undo();
            fix.detectChanges();

            summaryRow = GridSummaryFunctions.getSummaryRowByDataRowIndex(fix, 6);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 1, ['Count'], ['2']);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 3, ['Min', 'Max'], ['35', '44']);

            summaryRow = GridSummaryFunctions.getSummaryRowByDataRowIndex(fix, 7);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 1, ['Count'], ['3']);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 3, ['Min', 'Max'], ['29', '43']);

            // Redo transactions
            treeGrid.transactions.redo();
            fix.detectChanges();

            summaryRow = GridSummaryFunctions.getSummaryRowByDataRowIndex(fix, 6);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 1, ['Count'], ['2']);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 3, ['Min', 'Max'], ['35', '44']);

            summaryRow = GridSummaryFunctions.getSummaryRowByDataRowIndex(fix, 7);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 1, ['Count'], ['3']);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 3, ['Min', 'Max'], ['13', '43']);
        });

        it('Update child node and change tree structure', () => {
            treeGrid.expandAll();
            fix.detectChanges();

            const newRow = {
                ID: 317,
                ParentID: -1,
                Name: 'New Employee',
                HireDate: new Date(1984, 3, 3),
                Age: 13
            };
            treeGrid.getRowByKey(317).update(newRow);
            fix.detectChanges();

            let summaryRow = GridSummaryFunctions.getSummaryRowByDataRowIndex(fix, 0);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 1, ['Count'], ['5']);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 3, ['Min', 'Max'], ['13', '61']);

            summaryRow = GridSummaryFunctions.getSummaryRowByDataRowIndex(fix, 3);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 1, ['Count'], ['2']);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 3, ['Min', 'Max'], ['29', '43']);

            summaryRow = GridSummaryFunctions.getSummaryRowByDataRowIndex(fix, 7);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 1, ['Count'], ['2']);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 3, ['Min', 'Max'], ['35', '44']);

            // Undo transactions
            treeGrid.transactions.undo();
            fix.detectChanges();

            summaryRow = GridSummaryFunctions.getSummaryRowByDataRowIndex(fix, 0);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 1, ['Count'], ['4']);

            summaryRow = GridSummaryFunctions.getSummaryRowByDataRowIndex(fix, 6);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 1, ['Count'], ['2']);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 3, ['Min', 'Max'], ['35', '44']);

            summaryRow = GridSummaryFunctions.getSummaryRowByDataRowIndex(fix, 7);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 1, ['Count'], ['3']);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 3, ['Min', 'Max'], ['29', '43']);

            // Redo transactions
            treeGrid.transactions.redo();
            fix.detectChanges();

            summaryRow = GridSummaryFunctions.getSummaryRowByDataRowIndex(fix, 0);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 1, ['Count'], ['5']);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 3, ['Min', 'Max'], ['13', '61']);

            summaryRow = GridSummaryFunctions.getSummaryRowByDataRowIndex(fix, 3);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 1, ['Count'], ['2']);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 3, ['Min', 'Max'], ['29', '43']);

            summaryRow = GridSummaryFunctions.getSummaryRowByDataRowIndex(fix, 7);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 1, ['Count'], ['2']);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 3, ['Min', 'Max'], ['35', '44']);

            // Clear transactions
            treeGrid.transactions.clear();
            fix.detectChanges();

            summaryRow = GridSummaryFunctions.getSummaryRowByDataRowIndex(fix, 0);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 1, ['Count'], ['4']);

            summaryRow = GridSummaryFunctions.getSummaryRowByDataRowIndex(fix, 6);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 1, ['Count'], ['2']);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 3, ['Min', 'Max'], ['35', '44']);

            summaryRow = GridSummaryFunctions.getSummaryRowByDataRowIndex(fix, 7);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 1, ['Count'], ['3']);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 3, ['Min', 'Max'], ['29', '43']);
        });

        it('Update cell', () => {
            treeGrid.summaryPosition = 'top';
            treeGrid.expandAll();
            fix.detectChanges();

            treeGrid.updateCell(-1, 147, 'Age');
            const cell = treeGrid.getCellByColumn(4, 'Age');
            cell.update(100);
            fix.detectChanges();

            let summaryRow = GridSummaryFunctions.getSummaryRowByDataRowIndex(fix, 0);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 1, ['Count'], ['4']);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 3, ['Min', 'Max'], ['-1', '61']);

            summaryRow = GridSummaryFunctions.getSummaryRowByDataRowIndex(fix, 1);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 1, ['Count'], ['3']);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 3, ['Min', 'Max'], ['29', '100']);

            // Clear transactions
            treeGrid.transactions.clear();
            fix.detectChanges();

            summaryRow = GridSummaryFunctions.getSummaryRowByDataRowIndex(fix, 0);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 1, ['Count'], ['4']);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 3, ['Min', 'Max'], ['42', '61']);

            summaryRow = GridSummaryFunctions.getSummaryRowByDataRowIndex(fix, 1);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 1, ['Count'], ['3']);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 3, ['Min', 'Max'], ['29', '43']);
        });

        it('Update cell and change tree grid structure', () => {
            treeGrid.summaryPosition = 'top';
            treeGrid.expandAll();
            fix.detectChanges();

            treeGrid.updateCell(317, 17, 'ParentID');
            fix.detectChanges();

            let summaryRow = GridSummaryFunctions.getSummaryRowByDataRowIndex(fix, 0);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 1, ['Count'], ['3']);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 3, ['Min', 'Max'], ['42', '55']);

            summaryRow = GridSummaryFunctions.getSummaryRowByDataRowIndex(fix, 1);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 1, ['Count'], ['3']);

            summaryRow = GridSummaryFunctions.getSummaryRowByDataRowIndex(fix, 5);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 1, ['Count'], ['3']);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 3, ['Min', 'Max'], ['35', '61']);

            // Undo transactions
            treeGrid.transactions.undo();
            fix.detectChanges();

            summaryRow = GridSummaryFunctions.getSummaryRowByDataRowIndex(fix, 0);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 1, ['Count'], ['4']);

            summaryRow = GridSummaryFunctions.getSummaryRowByDataRowIndex(fix, 5);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 1, ['Count'], ['2']);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 3, ['Min', 'Max'], ['35', '44']);

            summaryRow = GridSummaryFunctions.getSummaryRowByDataRowIndex(fix, 1);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 1, ['Count'], ['3']);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 3, ['Min', 'Max'], ['29', '43']);

            // Redo transactions
            treeGrid.transactions.redo();
            fix.detectChanges();
            summaryRow = GridSummaryFunctions.getSummaryRowByDataRowIndex(fix, 0);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 1, ['Count'], ['3']);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 3, ['Min', 'Max'], ['42', '55']);

            summaryRow = GridSummaryFunctions.getSummaryRowByDataRowIndex(fix, 1);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 1, ['Count'], ['3']);

            summaryRow = GridSummaryFunctions.getSummaryRowByDataRowIndex(fix, 5);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 1, ['Count'], ['3']);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 3, ['Min', 'Max'], ['35', '61']);
        });
    });

    describe('Keyboard Navigation', () => {
        let fix;
        let treeGrid;
        beforeEach(fakeAsync(/** height/width setter rAF */() => {
            fix = TestBed.createComponent(IgxTreeGridSummariesKeyScroliingComponent);
            fix.detectChanges();
            tick(16);
            treeGrid = fix.componentInstance.treeGrid;
            setupGridScrollDetection(fix, treeGrid);
            tick(16);
        }));

        it('should be able to select root summaries with arrow keys', async () => {
            GridSummaryFunctions.focusSummaryCell(fix, 0, 0);
            await wait(DEBOUNCETIME);

            for (let i = 0; i < 5; i++) {
                GridSummaryFunctions.verifySummaryCellActive(fix, 0, i);
                await GridSummaryFunctions.moveSummaryCell(fix, 0, i, 'ArrowRight');
            }

            await GridSummaryFunctions.moveSummaryCell(fix, 0, 5, 'ArrowRight');
            GridSummaryFunctions.verifySummaryCellActive(fix, 0, 5);

            let summaryRow = GridSummaryFunctions.getSummaryRowByDataRowIndex(fix, 0);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 4,
                ['Count', 'Min', 'Max', 'Sum', 'Avg'], ['4', '42', '61', '207', '51.75']);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 5, ['Count'], ['4']);

            for (let i = 5; i > 0; i--) {
                GridSummaryFunctions.verifySummaryCellActive(fix, 0, i);
                await GridSummaryFunctions.moveSummaryCell(fix, 0, i, 'ArrowLeft');
            }

            await GridSummaryFunctions.moveSummaryCell(fix, 0, 0, 'ArrowLeft');
            GridSummaryFunctions.verifySummaryCellActive(fix, 0, 0);

            summaryRow = GridSummaryFunctions.getSummaryRowByDataRowIndex(fix, 0);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 0, [], []);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 1, ['Count', 'Min', 'Max', 'Sum', 'Avg'], ['4', '-1', '-1', '-4', '-1']);
        });

        it('should be able to select summaries with tab and shift+tab', async () => {
            GridSummaryFunctions.focusSummaryCell(fix, 0, 0);
            await wait(DEBOUNCETIME);

            // Should navigate with Tab key
            for (let i = 0; i < 5; i++) {
                GridSummaryFunctions.verifySummaryCellActive(fix, 0, i);
                await GridSummaryFunctions.moveSummaryCell(fix, 0, i, 'Tab');
            }

            let summaryRow = GridSummaryFunctions.getSummaryRowByDataRowIndex(fix, 0);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 4,
                ['Count', 'Min', 'Max', 'Sum', 'Avg'], ['4', '42', '61', '207', '51.75']);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 5, ['Count'], ['4']);

            // Should not change active item when press Tab on the last summary cell
            await GridSummaryFunctions.moveSummaryCell(fix, 0, 5, 'Tab');
            GridSummaryFunctions.verifySummaryCellActive(fix, 0, 5);

            // Should navigate with Shift+Tab keys
            for (let i = 5; i > 0; i--) {
                GridSummaryFunctions.verifySummaryCellActive(fix, 0, i);
                await GridSummaryFunctions.moveSummaryCell(fix, 0, i, 'Tab', true);
            }
            summaryRow = GridSummaryFunctions.getSummaryRowByDataRowIndex(fix, 0);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 0, [], []);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 1, ['Count', 'Min', 'Max', 'Sum', 'Avg'], ['4', '-1', '-1', '-4', '-1']);
        });

        it('should select last cell when press Shift+Tab on root summaries', async () => {
            treeGrid.expandAll();
            fix.detectChanges();

            GridSummaryFunctions.focusSummaryCell(fix, 0, 0);
            await wait(DEBOUNCETIME);

            GridSummaryFunctions.verifySummaryCellActive(fix, 0, 0);

            await GridSummaryFunctions.moveSummaryCell(fix, 0, 0, 'Tab', true);
            await wait(200);
            fix.detectChanges();

            GridSummaryFunctions.verifySummaryCellActive(fix, 24, 5);

            await GridSummaryFunctions.moveSummaryCell(fix, 24, 5, 'Tab');
            await wait(200);
            fix.detectChanges();

            GridSummaryFunctions.verifySummaryCellActive(fix, 0, 0);
        });

        it('should select first root summary cell when press Tab an a last grid cell', async () => {
            GridSummaryFunctions.focusSummaryCell(fix, 0, 0);
            await wait(DEBOUNCETIME);

            GridSummaryFunctions.verifySummaryCellActive(fix, 0, 0);
            await GridSummaryFunctions.moveSummaryCell(fix, 0, 0, 'Tab', true);

            const cell = treeGrid.getCellByColumn(3, 'OnPTO');
            expect(cell.selected).toBe(true);
            expect(cell.focused).toBe(true);

            UIInteractions.triggerKeyDownEvtUponElem('tab', cell.nativeElement, true);
            await wait(100);
            fix.detectChanges();

            GridSummaryFunctions.verifySummaryCellActive(fix, 0, 0);
        });

        it('should be able to navigate with Arrow keys and Ctrl', async () => {
            GridSummaryFunctions.focusSummaryCell(fix, 0, 1);
            await wait(DEBOUNCETIME);

            await GridSummaryFunctions.moveSummaryCell(fix, 0, 1, 'ArrowRight', false, true);
            await wait(100);
            GridSummaryFunctions.verifySummaryCellActive(fix, 0, 5);
            let summaryRow = GridSummaryFunctions.getSummaryRowByDataRowIndex(fix, 0);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 4,
                ['Count', 'Min', 'Max', 'Sum', 'Avg'], ['4', '42', '61', '207', '51.75']);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 5, ['Count'], ['4']);

            await GridSummaryFunctions.moveSummaryCell(fix, 0, 5, 'ArrowLeft', false, true);
            await wait(100);
            GridSummaryFunctions.verifySummaryCellActive(fix, 0, 0);
            summaryRow = GridSummaryFunctions.getSummaryRowByDataRowIndex(fix, 0);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 0, [], []);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 1, ['Count', 'Min', 'Max', 'Sum', 'Avg'], ['4', '-1', '-1', '-4', '-1']);
        });

        it('Should be able to select child summaries with arrow keys', async () => {
            treeGrid.expandAll();
            treeGrid.summaryPosition = 'top';
            fix.detectChanges();

            GridSummaryFunctions.focusSummaryCell(fix, 1, 0);
            await wait(DEBOUNCETIME);

            for (let i = 0; i < 5; i++) {
                GridSummaryFunctions.verifySummaryCellActive(fix, 1, i);
                await GridSummaryFunctions.moveSummaryCell(fix, 1, i, 'ArrowRight');
            }

            let summaryRow = GridSummaryFunctions.getSummaryRowByDataRowIndex(fix, 1);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 4,
                ['Count', 'Min', 'Max', 'Sum', 'Avg'], ['3', '29', '43', '103', '34.333']);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 5, ['Count'], ['3']);

            for (let i = 5; i > 0; i--) {
                GridSummaryFunctions.verifySummaryCellActive(fix, 1, i);
                await GridSummaryFunctions.moveSummaryCell(fix, 1, i, 'ArrowLeft');
            }

            summaryRow = GridSummaryFunctions.getSummaryRowByDataRowIndex(fix, 1);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 0, [], []);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 1,
                ['Count', 'Min', 'Max', 'Sum', 'Avg'], ['3', '147', '147', '441', '147']);
        });

        it('Should not change active summary cell when press Ctrl+ArrowUp/Down', async () => {
            treeGrid.expandAll();
            fix.detectChanges();

            GridSummaryFunctions.focusSummaryCell(fix, 6, 1);
            GridSummaryFunctions.verifySummaryCellActive(fix, 6, 1);

            await GridSummaryFunctions.moveSummaryCell(fix, 6, 1, 'ArrowDown', false, true);
            GridSummaryFunctions.verifySummaryCellActive(fix, 6, 1);

            await GridSummaryFunctions.moveSummaryCell(fix, 6, 1, 'ArrowUp', false, true);
            GridSummaryFunctions.verifySummaryCellActive(fix, 6, 1);
        });

        it('Should not change active summary cell when press Arrow Down and it is last summary row', async () => {
            treeGrid.expandAll();
            fix.detectChanges();

            treeGrid.verticalScrollContainer.scrollTo(treeGrid.dataView.length - 1);
            await wait(100);
            fix.detectChanges();

            GridSummaryFunctions.focusSummaryCell(fix, 24, 1);
            GridSummaryFunctions.verifySummaryCellActive(fix, 24, 1);

            await GridSummaryFunctions.moveSummaryCell(fix, 24, 1, 'ArrowDown');
            GridSummaryFunctions.verifySummaryCellActive(fix, 24, 1);
        });

        it('Should be able to navigate with Arrow keys Left/Right and Ctrl on a child summary', async () => {
            treeGrid.expandAll();
            fix.detectChanges();

            GridSummaryFunctions.focusSummaryCell(fix, 6, 1);
            await wait(DEBOUNCETIME);

            await GridSummaryFunctions.moveSummaryCell(fix, 6, 1, 'ArrowRight', false, true);
            await wait(150);
            fix.detectChanges();

            GridSummaryFunctions.verifySummaryCellActive(fix, 6, 5);
            let summaryRow = GridSummaryFunctions.getSummaryRowByDataRowIndex(fix, 6);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 5, ['Count'], ['2']);

            await GridSummaryFunctions.moveSummaryCell(fix, 6, 5, 'ArrowLeft', false, true);
            await wait(100);
            GridSummaryFunctions.verifySummaryCellActive(fix, 6, 0);

            summaryRow = GridSummaryFunctions.getSummaryRowByDataRowIndex(fix, 6);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 0, [], []);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 1,
                ['Count', 'Min', 'Max', 'Sum', 'Avg'], ['2', '317', '317', '634', '317']);
        });

        it('Should navigate with Tab key on child summary row ', async () => {
            treeGrid.toggleRow(147);
            fix.detectChanges();

            GridSummaryFunctions.focusSummaryCell(fix, 4, 0);
            await wait(DEBOUNCETIME);

            for (let i = 0; i < 5; i++) {
                GridSummaryFunctions.verifySummaryCellActive(fix, 4, i);
                await GridSummaryFunctions.moveSummaryCell(fix, 4, i, 'Tab');
            }

            let summaryRow = GridSummaryFunctions.getSummaryRowByDataRowIndex(fix, 4);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 4,
                ['Count', 'Min', 'Max', 'Sum', 'Avg'], ['3', '29', '43', '103', '34.333']);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 5, ['Count'], ['3']);

            for (let i = 5; i > 0; i--) {
                GridSummaryFunctions.verifySummaryCellActive(fix, 4, i);
                await GridSummaryFunctions.moveSummaryCell(fix, 4, i, 'Tab', true);
            }

            summaryRow = GridSummaryFunctions.getSummaryRowByDataRowIndex(fix, 4);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 0, [], []);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 1,
                ['Count', 'Min', 'Max', 'Sum', 'Avg'], ['3', '147', '147', '441', '147']);
        });

        it('Should navigate with Tab and Shift+Tab key on summary cell to treeGrid cell ', async () => {
            treeGrid.expandAll();
            fix.detectChanges();

            GridSummaryFunctions.focusSummaryCell(fix, 6, 0);
            await wait(30);

            await GridSummaryFunctions.moveSummaryCell(fix, 6, 0, 'Tab', true);
            await wait(100);

            let cell = treeGrid.getCellByColumn(5, 'OnPTO');
            expect(cell.selected).toBe(true);
            expect(cell.focused).toBe(true);

            let summaryRow = GridSummaryFunctions.getSummaryRowByDataRowIndex(fix, 6);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 4,
                ['Count', 'Min', 'Max', 'Sum', 'Avg'], ['2', '35', '44', '79', '39.5']);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 5, ['Count'], ['2']);

            UIInteractions.triggerKeyDownEvtUponElem('tab', cell.nativeElement, true);
            await wait(100);
            fix.detectChanges();

            GridSummaryFunctions.verifySummaryCellActive(fix, 6, 0);
            summaryRow = GridSummaryFunctions.getSummaryRowByDataRowIndex(fix, 6);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 0, [], []);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 1,
                ['Count', 'Min', 'Max', 'Sum', 'Avg'], ['2', '317', '317', '634', '317']);

            await GridSummaryFunctions.moveSummaryCell(fix, 6, 0, 'ArrowRight', false, true);
            await wait(200);
            GridSummaryFunctions.verifySummaryCellActive(fix, 6, 5);
            cell = treeGrid.getCellByColumn(5, 'OnPTO');
            expect(cell.selected).toBe(true);

            await GridSummaryFunctions.moveSummaryCell(fix, 6, 5, 'Tab');
            await wait(200);
            fix.detectChanges();

            GridSummaryFunctions.verifySummaryCellActive(fix, 7, 0);

            await GridSummaryFunctions.moveSummaryCell(fix, 7, 0, 'Tab', true);
            await wait(100);
            fix.detectChanges();

            GridSummaryFunctions.verifySummaryCellActive(fix, 6, 5);
        });

        it('Should navigate with arrow keys from treeGrid cell to summary row ', async () => {
            treeGrid.expandAll();
            treeGrid.summaryPosition = 'top';
            fix.detectChanges();

            let cell = treeGrid.getCellByColumn(0, 'ParentID');
            cell.nativeElement.dispatchEvent(new Event('focus'));
            await wait(DEBOUNCETIME);
            fix.detectChanges();

            cell = treeGrid.getCellByColumn(0, 'ParentID');
            expect(cell.selected).toBe(true);

            UIInteractions.triggerKeyDownEvtUponElem('ArrowDown', cell.nativeElement, true);
            await wait(DEBOUNCETIME);
            fix.detectChanges();

            cell = treeGrid.getCellByColumn(0, 'ParentID');
            expect(cell.selected).toBe(true);
            GridSummaryFunctions.verifySummaryCellActive(fix, 1, 1);

            await GridSummaryFunctions.moveSummaryCell(fix, 1, 1, 'ArrowRight');
            fix.detectChanges();

            cell = treeGrid.getCellByColumn(0, 'ParentID');
            expect(cell.selected).toBe(true);
            GridSummaryFunctions.verifySummaryCellActive(fix, 1, 2);

            await GridSummaryFunctions.moveSummaryCell(fix, 1, 2, 'ArrowRight');
            fix.detectChanges();

            cell = treeGrid.getCellByColumn(0, 'ParentID');
            expect(cell.selected).toBe(true);
            GridSummaryFunctions.verifySummaryCellActive(fix, 1, 3);

            await GridSummaryFunctions.moveSummaryCell(fix, 1, 3, 'ArrowDown');
            fix.detectChanges();

            cell = treeGrid.getCellByColumn(2, 'HireDate');
            expect(cell.selected).toBe(true);
            GridSummaryFunctions.verifySummaryCellActive(fix, 1, 3, false);

            UIInteractions.triggerKeyDownEvtUponElem('ArrowUp', cell.nativeElement, true);
            await wait(50);
            fix.detectChanges();

            cell = treeGrid.getCellByColumn(2, 'HireDate');
            expect(cell.selected).toBe(true);
            GridSummaryFunctions.verifySummaryCellActive(fix, 1, 3);

            await GridSummaryFunctions.moveSummaryCell(fix, 1, 3, 'ArrowUp');
            await wait(DEBOUNCETIME);
            fix.detectChanges();

            cell = treeGrid.getCellByColumn(2, 'HireDate');
            expect(cell.selected).toBe(false);
            cell = treeGrid.getCellByColumn(0, 'HireDate');
            expect(cell.selected).toBe(true);
            GridSummaryFunctions.verifySummaryCellActive(fix, 1, 3, false);
        });
    });

    it('should render correct custom summaries', fakeAsync(/** height/width setter rAF */() => {
        const fix = TestBed.createComponent(IgxTreeGridCustomSummariesComponent);
        fix.detectChanges();
        const treeGrid = fix.componentInstance.treeGrid;
        treeGrid.expandAll();
        fix.detectChanges();

        GridSummaryFunctions.verifyVisibleSummariesHeight(fix, 3);

        let summaryRow = GridSummaryFunctions.getSummaryRowByDataRowIndex(fix, 7);
        GridSummaryFunctions.verifyColumnSummaries(summaryRow, 3, ['Count', 'Sum', 'Avg'], ['3', '103', '34.33']);

        summaryRow = GridSummaryFunctions.getSummaryRowByDataRowIndex(fix, 6);
        GridSummaryFunctions.verifyColumnSummaries(summaryRow, 3, ['Count', 'Sum', 'Avg'], ['2', '79', '39.5']);

        summaryRow = GridSummaryFunctions.getSummaryRowByDataRowIndex(fix, 0);
        GridSummaryFunctions.verifyColumnSummaries(summaryRow, 3, ['Count', 'Sum', 'Avg'], ['4', '207', '51.75']);
    }));

    it('should render summaries for all the rows', fakeAsync(/** height/width setter rAF */() => {
        const fix = TestBed.createComponent(IgxTreeGridSummariesComponent);
        fix.detectChanges();
        const treeGrid = fix.componentInstance.treeGrid;

        verifyTreeBaseSummaries(fix);
        expect(GridSummaryFunctions.getAllVisibleSummariesLength(fix)).toEqual(1);

        treeGrid.toggleRow(treeGrid.getRowByIndex(1).rowID);
        fix.detectChanges();

        verifyTreeBaseSummaries(fix);
        verifySummaryForRow847(fix, 4);
        expect(GridSummaryFunctions.getAllVisibleSummariesLength(fix)).toEqual(2);

        treeGrid.toggleRow(treeGrid.getRowByIndex(3).rowID);
        fix.detectChanges();

        expect(GridSummaryFunctions.getAllVisibleSummariesLength(fix)).toEqual(3);

        verifyTreeBaseSummaries(fix);
        verifySummaryForRow663(fix, 5);
        verifySummaryForRow847(fix, 6);
    }));

    it('should be able to access alldata from each summary', fakeAsync(() => {
        const fix = TestBed.createComponent(IgxTreeGridCustomSummariesComponent);
        fix.detectChanges();
        const treeGrid = fix.componentInstance.treeGrid;

        treeGrid.expandAll();
        fix.detectChanges();

        let summaryRow = GridSummaryFunctions.getSummaryRowByDataRowIndex(fix, 6);
        GridSummaryFunctions.verifyColumnSummaries(summaryRow, 1, ['Count'], ['2']);
        summaryRow = GridSummaryFunctions.getSummaryRowByDataRowIndex(fix, 7);
        GridSummaryFunctions.verifyColumnSummaries(summaryRow, 1, ['Count'], ['3']);
        summaryRow = GridSummaryFunctions.getSummaryRowByDataRowIndex(fix, 0);
        GridSummaryFunctions.verifyColumnSummaries(summaryRow, 1, ['Count'], ['4']);

        treeGrid.getColumnByName('Name').summaries = fix.componentInstance.ptoSummary;
        tick();
        fix.detectChanges();

        summaryRow = GridSummaryFunctions.getSummaryRowByDataRowIndex(fix, 6);
        GridSummaryFunctions.verifyColumnSummaries(summaryRow, 1, ['Count', 'People on PTO'], ['2', '1']);
        summaryRow = GridSummaryFunctions.getSummaryRowByDataRowIndex(fix, 7);
        GridSummaryFunctions.verifyColumnSummaries(summaryRow, 1, ['Count', 'People on PTO'], ['3', '1']);
        summaryRow = GridSummaryFunctions.getSummaryRowByDataRowIndex(fix, 0);
        GridSummaryFunctions.verifyColumnSummaries(summaryRow, 1, ['Count', 'People on PTO'], ['4', '0']);

        treeGrid.getCellByColumn(5, 'OnPTO').update(true);
        tick();
        fix.detectChanges();

        summaryRow = GridSummaryFunctions.getSummaryRowByDataRowIndex(fix, 6);
        GridSummaryFunctions.verifyColumnSummaries(summaryRow, 1, ['Count', 'People on PTO'], ['2', '2']);
        summaryRow = GridSummaryFunctions.getSummaryRowByDataRowIndex(fix, 7);
        GridSummaryFunctions.verifyColumnSummaries(summaryRow, 1, ['Count', 'People on PTO'], ['3', '1']);
        summaryRow = GridSummaryFunctions.getSummaryRowByDataRowIndex(fix, 0);
        GridSummaryFunctions.verifyColumnSummaries(summaryRow, 1, ['Count', 'People on PTO'], ['4', '0']);
    }));

    it('should render rows correctly after collapse and expand', async () => {
        const fix = TestBed.createComponent(IgxTreeGridSummariesScrollingComponent);
        const treeGrid = fix.componentInstance.treeGrid;
        setupGridScrollDetection(fix, treeGrid);
        fix.detectChanges();
        await wait(16);

        (treeGrid as any).scrollTo(23, 0, 0);
        fix.detectChanges();
        await wait(16);
        fix.detectChanges();

        let row = treeGrid.getRowByKey(15);
        (row as IgxTreeGridRowComponent).expanded = false;
        fix.detectChanges();
        await wait(16);
        fix.detectChanges();

        row = treeGrid.getRowByKey(15);
        (row as IgxTreeGridRowComponent).expanded = true;
        fix.detectChanges();
        await wait(16);
        fix.detectChanges();

        expect(treeGrid.dataRowList.length).toEqual(10);
    });

    function verifySummaryForRow147(fixture, visibleIndex) {
        const summaryRow = GridSummaryFunctions.getSummaryRowByDataRowIndex(fixture, visibleIndex);
        GridSummaryFunctions.verifyColumnSummaries(summaryRow, 0, [], []);
        GridSummaryFunctions.verifyColumnSummaries(summaryRow, 1, ['Count'], ['3']);
        GridSummaryFunctions.verifyColumnSummaries(summaryRow, 2, ['Count', 'Earliest', 'Latest'], ['3', 'Jul 19, 2009', 'Sep 18, 2014']);
        GridSummaryFunctions.verifyColumnSummaries(summaryRow, 3,
            ['Count', 'Min', 'Max', 'Sum', 'Avg'], ['3', '29', '43', '103', '34.333']);
        GridSummaryFunctions.verifyColumnSummaries(summaryRow, 4, ['Count'], ['3']);
    }

    function verifySummaryForRow317(fixture, visibleIndex) {
        const summaryRow = GridSummaryFunctions.getSummaryRowByDataRowIndex(fixture, visibleIndex);
        GridSummaryFunctions.verifyColumnSummaries(summaryRow, 0, [], []);
        GridSummaryFunctions.verifyColumnSummaries(summaryRow, 1, ['Count'], ['2']);
        GridSummaryFunctions.verifyColumnSummaries(summaryRow, 2, ['Count', 'Earliest', 'Latest'], ['2', 'Nov 11, 2009', 'Oct 17, 2015']);
        GridSummaryFunctions.verifyColumnSummaries(summaryRow, 3, ['Count', 'Min', 'Max', 'Sum', 'Avg'], ['2', '35', '44', '79', '39.5']);
        GridSummaryFunctions.verifyColumnSummaries(summaryRow, 4, ['Count'], ['2']);
    }

    function verifySummaryForRow847(fixture, visibleIndex) {
        const summaryRow = GridSummaryFunctions.getSummaryRowByDataRowIndex(fixture, visibleIndex);
        GridSummaryFunctions.verifyColumnSummaries(summaryRow, 0, [], []);
        GridSummaryFunctions.verifyColumnSummaries(summaryRow, 1, ['Count'], ['2']);
        GridSummaryFunctions.verifyColumnSummaries(summaryRow, 2, ['Count', 'Earliest', 'Latest'], ['2', 'May 4, 2014', 'Dec 9, 2017']);
        GridSummaryFunctions.verifyColumnSummaries(summaryRow, 3, ['Count', 'Min', 'Max', 'Sum', 'Avg'], ['2', '25', '44', '69', '34.5']);
        GridSummaryFunctions.verifyColumnSummaries(summaryRow, 4, ['Count'], ['2']);
    }

    function verifySummaryForRow663(fixture, visibleIndex) {
        const summaryRow = GridSummaryFunctions.getSummaryRowByDataRowIndex(fixture, visibleIndex);
        GridSummaryFunctions.verifyColumnSummaries(summaryRow, 0, [], []);
        GridSummaryFunctions.verifyColumnSummaries(summaryRow, 1, ['Count'], ['1']);
        GridSummaryFunctions.verifyColumnSummaries(summaryRow, 2, ['Count', 'Earliest', 'Latest'], ['1', 'Apr 22, 2010', 'Apr 22, 2010']);
        GridSummaryFunctions.verifyColumnSummaries(summaryRow, 3, ['Count', 'Min', 'Max', 'Sum', 'Avg'], ['1', '39', '39', '39', '39']);
        GridSummaryFunctions.verifyColumnSummaries(summaryRow, 4, ['Count'], ['1']);
    }

    function verifySummaryIsEmpty(summaryRow) {
        GridSummaryFunctions.verifyColumnSummaries(summaryRow, 0, [], []);
        GridSummaryFunctions.verifyColumnSummaries(summaryRow, 1, ['Count'], ['0']);
        GridSummaryFunctions.verifyColumnSummaries(summaryRow, 2, ['Count', 'Earliest', 'Latest'], ['0', '', '']);
        GridSummaryFunctions.verifyColumnSummaries(summaryRow, 3, ['Count', 'Min', 'Max', 'Sum', 'Avg'], ['0', '0', '0', '0', '0']);
        GridSummaryFunctions.verifyColumnSummaries(summaryRow, 4, ['Count'], ['0']);
    }

    function verifyTreeBaseSummaries(fixture) {
        const summaryRow = GridSummaryFunctions.getSummaryRowByDataRowIndex(fixture, 0);
        GridSummaryFunctions.verifyColumnSummaries(summaryRow, 0, [], []);
        GridSummaryFunctions.verifyColumnSummaries(summaryRow, 1, ['Count'], ['4']);
        GridSummaryFunctions.verifyColumnSummaries(summaryRow, 2, ['Count', 'Earliest', 'Latest'], ['4', 'Apr 20, 2008', 'Feb 22, 2014']);
        GridSummaryFunctions.verifyColumnSummaries(summaryRow, 3, ['Count', 'Min', 'Max', 'Sum', 'Avg'], ['4', '42', '61', '207', '51.75']);
        GridSummaryFunctions.verifyColumnSummaries(summaryRow, 4, ['Count'], ['4']);
    }
});
