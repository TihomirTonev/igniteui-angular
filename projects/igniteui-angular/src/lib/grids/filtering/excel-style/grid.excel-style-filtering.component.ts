import {
    ChangeDetectorRef,
    Component,
    ViewChild,
    HostBinding,
    ChangeDetectionStrategy,
    TemplateRef,
    Directive,
    OnDestroy,
    ElementRef,
    Input,
    ViewRef
} from '@angular/core';
import {
    HorizontalAlignment,
    VerticalAlignment,
    OverlaySettings,
    IgxOverlayService,
    AbsoluteScrollStrategy,
    AutoPositionStrategy
} from '../../../services/index';
import { IgxFilteringService, ExpressionUI } from '../grid-filtering.service';
import {
    IFilteringOperation,
    IgxStringFilteringOperand,
    IgxNumberFilteringOperand,
    IgxBooleanFilteringOperand,
    IgxDateFilteringOperand
} from '../../../data-operations/filtering-condition';
import { FilteringExpressionsTree, IFilteringExpressionsTree } from '../../../data-operations/filtering-expressions-tree';
import { FilteringLogic, IFilteringExpression } from '../../../data-operations/filtering-expression.interface';
import { cloneArray, KEYS } from '../../../core/utils';
import { DataType, DataUtil } from '../../../data-operations/data-util';
import { IgxExcelStyleSearchComponent } from './excel-style-search.component';
import { IgxExcelStyleCustomDialogComponent } from './excel-style-custom-dialog.component';
import { Subscription, Subject } from 'rxjs';
import { IgxExcelStyleSortingComponent } from './excel-style-sorting.component';
import { takeUntil } from 'rxjs/operators';
import { ISelectionEventArgs, IgxDropDownComponent } from '../../../drop-down';
import { IgxColumnComponent } from '../../columns/column.component';
import { IgxGridBaseDirective } from '../../grid-base.directive';

/**
 *@hidden
 */
export class FilterListItem {
    public value: any;
    public label: any;
    public isSelected: boolean;
    public indeterminate: boolean;
    public isSpecial = false;
}

@Directive({
    selector: '[igxExcelStyleSorting]'
})
export class IgxExcelStyleSortingTemplateDirective {
    constructor(public template: TemplateRef<any>) {}
}

@Directive({
    selector: '[igxExcelStyleMoving]'
})
export class IgxExcelStyleMovingTemplateDirective {
    constructor(public template: TemplateRef<any>) {}
}

@Directive({
    selector: '[igxExcelStyleHiding]'
})
export class IgxExcelStyleHidingTemplateDirective {
    constructor(public template: TemplateRef<any>) {}
}

@Directive({
    selector: '[igxExcelStylePinning]'
})
export class IgxExcelStylePinningTemplateDirective {
    constructor(public template: TemplateRef<any>) {}
}

/**
 * A component used for presenting Excel style filtering UI for a specific column.
 * It is used internally in the Grid, but could also be hosted in a container outside of it.
 *
 * Example:
 * ```html
 * <igx-grid-excel-style-filtering
 *     [column]="grid1.columns[0]">
 * </igx-grid-excel-style-filtering>
 * ```
 */
@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    preserveWhitespaces: false,
    selector: 'igx-grid-excel-style-filtering',
    templateUrl: './grid.excel-style-filtering.component.html'
})
export class IgxGridExcelStyleFilteringComponent implements OnDestroy {
    private static readonly filterOptimizationThreshold = 2;

    private shouldOpenSubMenu = true;
    private expressionsList = new Array<ExpressionUI>();
    private destroy$ = new Subject<boolean>();
    private containsNullOrEmpty = false;
    private selectAllSelected = true;
    private selectAllIndeterminate = false;
    private filterValues = new Set<any>();
    private _column: IgxColumnComponent;
    private _columnPinning: Subscription;
    private _columnVisibilityChanged: Subscription;
    private _filteringChanged: Subscription;
    private _densityChanged: Subscription;

    /**
     * An @Input property that sets the column.
     */
    @Input()
    public set column(value: IgxColumnComponent) {
        this._column = value;

        if (this._columnPinning) {
            this._columnPinning.unsubscribe();
        }

        if (this._columnVisibilityChanged) {
            this._columnVisibilityChanged.unsubscribe();
        }

        if (this._filteringChanged) {
            this._filteringChanged.unsubscribe();
        }

        if (this._densityChanged) {
            this._densityChanged.unsubscribe();
        }

        if (this._column) {
            this._column.grid.filteringService.registerSVGIcons();
            this.isColumnPinnable = this.column.pinnable;
            this.init();

            this._columnPinning = this.grid.onColumnPinning.pipe(takeUntil(this.destroy$)).subscribe(() => {
                requestAnimationFrame(() => {
                    this.isColumnPinnable = this.column.pinnable;
                    if (!(this.cdr as ViewRef).destroyed) {
                       this.cdr.detectChanges();
                    }
                });
            });
            this._columnVisibilityChanged = this.grid.onColumnVisibilityChanged.pipe(takeUntil(this.destroy$)).subscribe(() => {
                this.cdr.detectChanges();
            });
            this._filteringChanged = this.grid.filteringExpressionsTreeChange.pipe(takeUntil(this.destroy$)).subscribe(() => {
                this.init();
            });
            this._densityChanged = this.grid.onDensityChanged.pipe(takeUntil(this.destroy$)).subscribe(() => {
                this.cdr.detectChanges();
            });
        }
    }

    /**
     * Returns the current column.
     */
    public get column(): IgxColumnComponent {
        return this._column;
    }

    /**
     * @hidden @internal
     */
    public get filteringService(): IgxFilteringService {
        return this.grid.filteringService;
    }

    /**
     * @hidden @internal
     */
    public listData = new Array<FilterListItem>();
    /**
     * @hidden @internal
     */
    public uniqueValues = [];
    /**
     * @hidden @internal
     */
    public overlayService: IgxOverlayService;
    /**
     * @hidden @internal
     */
    public overlayComponentId: string;

    private _subMenuPositionSettings = {
        verticalStartPoint: VerticalAlignment.Top
    };

    private _subMenuOverlaySettings: OverlaySettings = {
        closeOnOutsideClick: true,
        modal: false,
        positionStrategy: new AutoPositionStrategy(this._subMenuPositionSettings),
        scrollStrategy: new AbsoluteScrollStrategy()
    };

    /**
     * @hidden @internal
     */
    @HostBinding('class.igx-excel-filter')
    className = 'igx-excel-filter';

    /**
     * @hidden @internal
     */
    @HostBinding('class.igx-excel-filter--inline')
    public inline = true;

    /**
     * @hidden @internal
     */
    @ViewChild('dropdown', { read: ElementRef })
    public mainDropdown: ElementRef;

    /**
     * @hidden @internal
     */
    @ViewChild('subMenu', { read: IgxDropDownComponent })
    public subMenu: IgxDropDownComponent;

    /**
     * @hidden @internal
     */
    @ViewChild('customDialog', { read: IgxExcelStyleCustomDialogComponent })
    public customDialog: IgxExcelStyleCustomDialogComponent;

    /**
     * @hidden @internal
     */
    @ViewChild('excelStyleSearch', { read: IgxExcelStyleSearchComponent })
    protected excelStyleSearch: IgxExcelStyleSearchComponent;

    /**
     * @hidden @internal
     */
    @ViewChild('excelStyleSorting', { read: IgxExcelStyleSortingComponent })
    protected excelStyleSorting: IgxExcelStyleSortingComponent;

    /**
     * @hidden @internal
     */
    @ViewChild('defaultExcelStyleSortingTemplate', { read: TemplateRef, static: true })
    protected defaultExcelStyleSortingTemplate: TemplateRef<any>;

    /**
     * @hidden @internal
     */
    @ViewChild('defaultExcelStyleHidingTemplate', { read: TemplateRef, static: true })
    protected defaultExcelStyleHidingTemplate: TemplateRef<any>;

    /**
     * @hidden @internal
     */
    @ViewChild('defaultExcelStyleMovingTemplate', { read: TemplateRef, static: true })
    protected defaultExcelStyleMovingTemplate: TemplateRef<any>;

    /**
     * @hidden @internal
     */
    @ViewChild('defaultExcelStylePinningTemplate', { read: TemplateRef, static: true })
    protected defaultExcelStylePinningTemplate: TemplateRef<any>;

    /**
     * @hidden @internal
     */
    public isColumnPinnable: boolean;

    /**
     * @hidden @internal
     */
    get grid(): IgxGridBaseDirective {
        return this.column.grid;
    }

    /**
     * @hidden @internal
     */
    get conditions() {
        return this.column.filters.conditionList();
    }

    /**
     * @hidden @internal
     */
    get subMenuText() {
        switch (this.column.dataType) {
            case DataType.Boolean:
                return this.grid.resourceStrings.igx_grid_excel_boolean_filter;
            case DataType.Number:
                return this.grid.resourceStrings.igx_grid_excel_number_filter;
            case DataType.Date:
                return this.grid.resourceStrings.igx_grid_excel_date_filter;
            default:
                return this.grid.resourceStrings.igx_grid_excel_text_filter;
        }
    }

    constructor(private cdr: ChangeDetectorRef) {}

    /**
     * @hidden @internal
     */
    ngOnDestroy(): void {
        this.destroy$.next(true);
        this.destroy$.complete();
    }

    private init() {
        this.expressionsList = new Array<ExpressionUI>();
        this.filteringService.generateExpressionsList(this.column.filteringExpressionsTree, this.grid.filteringLogic, this.expressionsList);
        this.populateColumnData();
    }

    /**
     * @hidden @internal
     */
    public clearFilterClass() {
        if (this.column.filteringExpressionsTree) {
            return 'igx-excel-filter__actions-clear';
        }

        return 'igx-excel-filter__actions-clear--disabled';
    }

    /**
     * @hidden @internal
     */
    public pinClass() {
        return this.isColumnPinnable ? 'igx-excel-filter__actions-pin' : 'igx-excel-filter__actions-pin--disabled';
    }

    /**
     * @hidden @internal
     */
    public initialize(column: IgxColumnComponent, overlayService: IgxOverlayService,
        overlayComponentId: string) {
        this.inline = false;
        this.column = column;
        this.overlayService = overlayService;
        this.overlayComponentId = overlayComponentId;

        this._subMenuOverlaySettings.outlet = (this.grid as any).outlet;

        requestAnimationFrame(() => {
            this.excelStyleSearch.searchInput.nativeElement.focus();
        });

        this.grid.onColumnMoving.pipe(takeUntil(this.destroy$)).subscribe(() => {
            this.closeDropdown();
        });
    }

    /**
     * @hidden @internal
     */
    public getCondition(value: string): IFilteringOperation {
        return this.column.filters.condition(value);
    }

    /**
     * @hidden @internal
     */
    public translateCondition(value: string): string {
        return this.grid.resourceStrings[`igx_grid_filter_${this.getCondition(value).name}`] || value;
    }

    /**
     * @hidden @internal
     */
    public onPin() {
        this.column.pinned = !this.column.pinned;
        this.closeDropdown();
    }

    /**
     * @hidden @internal
     */
    public onHideToggle() {
        this.column.hidden = !this.column.hidden;
        this.grid.onColumnVisibilityChanged.emit({ column: this.column, newValue: this.column.hidden });
        this.closeDropdown();
    }

    /**
     * @hidden @internal
     */
    public onTextFilterClick(eventArgs) {
        if (this.shouldOpenSubMenu) {
            this._subMenuOverlaySettings.positionStrategy.settings.target = eventArgs.currentTarget;

            const gridRect = this.grid.nativeElement.getBoundingClientRect();
            const dropdownRect = this.mainDropdown.nativeElement.getBoundingClientRect();

            let x = dropdownRect.left + dropdownRect.width;
            let x1 = gridRect.left + gridRect.width;
            x += window.pageXOffset;
            x1 += window.pageXOffset;
            if (Math.abs(x - x1) < 200) {
                this._subMenuOverlaySettings.positionStrategy.settings.horizontalDirection = HorizontalAlignment.Left;
                this._subMenuOverlaySettings.positionStrategy.settings.horizontalStartPoint = HorizontalAlignment.Left;
            } else {
                this._subMenuOverlaySettings.positionStrategy.settings.horizontalDirection = HorizontalAlignment.Right;
                this._subMenuOverlaySettings.positionStrategy.settings.horizontalStartPoint = HorizontalAlignment.Right;
            }

            this.subMenu.open(this._subMenuOverlaySettings);
            this.shouldOpenSubMenu = false;
        }
    }

    /**
     * @hidden @internal
     */
    public onTextFilterKeyDown(eventArgs) {
        if (eventArgs.key === KEYS.ENTER) {
            this.onTextFilterClick(eventArgs);
        }
    }

    /**
     * @hidden @internal
     */
    public onSubMenuClosed() {
        requestAnimationFrame(() => {
            this.shouldOpenSubMenu = true;
        });
    }

    /**
     * @hidden @internal
     */
    public onSubMenuSelection(eventArgs: ISelectionEventArgs) {
        if (this.expressionsList && this.expressionsList.length &&
            this.expressionsList[0].expression.condition.name !== 'in') {
            this.customDialog.expressionsList = this.expressionsList;
        }

        this.customDialog.selectedOperator = eventArgs.newSelection.value;
        eventArgs.cancel = true;
        if (this.overlayComponentId) {
            this.mainDropdown.nativeElement.style.display = 'none';
        }
        this.subMenu.close();
        this.customDialog.open(this.mainDropdown.nativeElement);
    }

    private areExpressionsSelectable () {
        if (this.expressionsList.length === 1 &&
            (this.expressionsList[0].expression.condition.name === 'equals' ||
             this.expressionsList[0].expression.condition.name === 'true' ||
             this.expressionsList[0].expression.condition.name === 'false' ||
             this.expressionsList[0].expression.condition.name === 'empty' ||
             this.expressionsList[0].expression.condition.name === 'in')) {
            return true;
        }

        const selectableExpressionsCount = this.expressionsList.filter(exp =>
            (exp.beforeOperator === 1 || exp.afterOperator === 1) &&
            (exp.expression.condition.name === 'equals' ||
             exp.expression.condition.name === 'true' ||
             exp.expression.condition.name === 'false' ||
             exp.expression.condition.name === 'empty' ||
             exp.expression.condition.name === 'in')).length;

        return selectableExpressionsCount === this.expressionsList.length;
    }

    private areExpressionsValuesInTheList() {
        if (this.column.dataType === DataType.Boolean) {
            return true;
        }

        if (this.filterValues.size === 1) {
            const firstValue = this.filterValues.values().next().value;

            if (!firstValue && firstValue !== 0) {
                return true;
            }
        }

        for (let index = 0; index < this.uniqueValues.length; index++) {
            if (this.filterValues.has(this.uniqueValues[index])) {
                return true;
            }
        }

        return false;
    }

    private populateColumnData() {
        if (this.grid.uniqueColumnValuesStrategy) {
            this.cdr.detectChanges();
            this.renderColumnValuesRemotely();
        } else {
            this.renderColumnValuesFromData();
        }
    }

    private renderColumnValuesRemotely() {
        this.excelStyleSearch.isLoading = true;
        const expressionsTree: FilteringExpressionsTree = this.getColumnFilterExpressionsTree();

        this.grid.uniqueColumnValuesStrategy(this.column, expressionsTree, (colVals: any[]) => {
            const columnValues = (this.column.dataType === DataType.Date) ?
                colVals.map(val => val ? val.toDateString() : val) : colVals;

            this.renderValues(columnValues);
            this.excelStyleSearch.isLoading = false;
            this.excelStyleSearch.refreshSize();
        });
    }

    private renderColumnValuesFromData() {
        let data = this.column.gridAPI.get_all_data((this.grid as any).id);
        const expressionsTree = this.getColumnFilterExpressionsTree();

        if (expressionsTree.filteringOperands.length) {
            const state = { expressionsTree: expressionsTree };
            data = DataUtil.filter(cloneArray(data), state);
        }

        const columnField = this.column.field;
        const columnValues = (this.column.dataType === DataType.Date) ?
            data.map(record => record[columnField] ? record[columnField].toDateString() : record[columnField]) :
            data.map(record => record[columnField]);

        this.renderValues(columnValues);
    }

    private renderValues(columnValues: any[]) {
        this.generateUniqueValues(columnValues);
        this.generateFilterValues(this.column.dataType === DataType.Date);
        this.generateListData();
    }

    private generateUniqueValues(columnValues: any[]) {
        this.uniqueValues = Array.from(new Set(columnValues));
    }

    private generateFilterValues(isDateColumn: boolean = false) {
        if (isDateColumn) {
            this.filterValues = new Set<any>(this.expressionsList.reduce((arr, e) => {
                if (e.expression.condition.name === 'in') {
                    return [ ...arr, ...Array.from((e.expression.searchVal as Set<any>).values()).map(v =>
                        new Date(v).toDateString()) ];
                }
                return [ ...arr, ...[e.expression.searchVal ? e.expression.searchVal.toDateString() : e.expression.searchVal] ];
            }, []));
        } else {
            this.filterValues = new Set<any>(this.expressionsList.reduce((arr, e) => {
                if (e.expression.condition.name === 'in') {
                    return [ ...arr, ...Array.from((e.expression.searchVal as Set<any>).values()) ];
                }
                return [ ...arr, ...[e.expression.searchVal] ];
            }, []));
        }
    }

    private generateListData() {
        this.listData = new Array<FilterListItem>();

        const shouldUpdateSelection = this.areExpressionsSelectable() && this.areExpressionsValuesInTheList();

        if (this.column.dataType === DataType.Boolean) {
            this.addBooleanItems();
        } else {
            this.addItems(shouldUpdateSelection);
        }

        this.listData.sort((a, b) => this.sortData(a, b));

        if (this.column.dataType === DataType.Date) {
            this.uniqueValues = this.uniqueValues.map(value => new Date(value));
        }

        if (this.containsNullOrEmpty) {
            this.addBlanksItem(shouldUpdateSelection);
        }

        this.addSelectAllItem();

        if (!(this.cdr as any).destroyed) {
            this.cdr.detectChanges();
        }
    }

    private getColumnFilterExpressionsTree() {
        const gridExpressionsTree: IFilteringExpressionsTree = this.grid.filteringExpressionsTree;
        const expressionsTree = new FilteringExpressionsTree(gridExpressionsTree.operator, gridExpressionsTree.fieldName);

        for (const operand of gridExpressionsTree.filteringOperands) {
            if (operand instanceof FilteringExpressionsTree) {
                const columnExprTree = operand as FilteringExpressionsTree;
                if (columnExprTree.fieldName === this.column.field) {
                    break;
                }
            }
            expressionsTree.filteringOperands.push(operand);
        }

        return expressionsTree;
    }

    private addBooleanItems() {
        this.selectAllSelected = true;
        this.selectAllIndeterminate = false;
        this.uniqueValues.forEach(element => {
            const filterListItem = new FilterListItem();
            if (element !== undefined && element !== null && element !== '') {
                if (this.column.filteringExpressionsTree) {
                    if (element === true && this.expressionsList.find(exp => exp.expression.condition.name === 'true' )) {
                        filterListItem.isSelected = true;
                        this.selectAllIndeterminate = true;
                    } else if (element === false && this.expressionsList.find(exp => exp.expression.condition.name === 'false' )) {
                            filterListItem.isSelected = true;
                            this.selectAllIndeterminate = true;
                    } else {
                        filterListItem.isSelected = false;
                    }
                } else {
                    filterListItem.isSelected = true;
                }
                filterListItem.value = element;
                filterListItem.label = element;
                filterListItem.indeterminate = false;
                this.listData.push(filterListItem);
            } else {
                this.containsNullOrEmpty = true;
            }
        });
    }

    private addItems(shouldUpdateSelection: boolean) {
        this.selectAllSelected = true;
        this.selectAllIndeterminate = false;
        this.uniqueValues.forEach(element => {
            if (element !== undefined && element !== null && element !== '') {
                const filterListItem = new FilterListItem();
                if (this.column.filteringExpressionsTree) {
                    if (shouldUpdateSelection) {
                        if (this.filterValues.has(element)) {
                            filterListItem.isSelected = true;
                        } else {
                            filterListItem.isSelected = false;
                        }
                        this.selectAllIndeterminate = true;
                    } else {
                        filterListItem.isSelected = false;
                        this.selectAllSelected = false;
                    }
                } else {
                    filterListItem.isSelected = true;
                }
                if (this.column.dataType === DataType.Date) {
                    filterListItem.value = new Date(element);
                    filterListItem.label = new Date(element);
                } else {
                    filterListItem.value = element;
                    filterListItem.label = element;
                }
                filterListItem.indeterminate = false;
                this.listData.push(filterListItem);
            } else {
                this.containsNullOrEmpty = true;
            }
        });
    }

    private addSelectAllItem() {
        const selectAll =  new FilterListItem();
        selectAll.isSelected = this.selectAllSelected;
        selectAll.value = this.grid.resourceStrings.igx_grid_excel_select_all;
        selectAll.label = this.grid.resourceStrings.igx_grid_excel_select_all;
        selectAll.indeterminate = this.selectAllIndeterminate;
        selectAll.isSpecial = true;
        this.listData.unshift(selectAll);
    }

    private addBlanksItem(shouldUpdateSelection) {
        const blanks =  new FilterListItem();
        if (this.column.filteringExpressionsTree) {
            if (shouldUpdateSelection) {
                if (this.filterValues.has(null)) {
                    blanks.isSelected = true;
                } else {
                    blanks.isSelected = false;
                }
            }
        } else {
            blanks.isSelected = true;
        }
        blanks.value = null;
        blanks.label = this.grid.resourceStrings.igx_grid_excel_blanks;
        blanks.indeterminate = false;
        blanks.isSpecial = true;
        this.listData.unshift(blanks);
    }

    private sortData(a: FilterListItem, b: FilterListItem) {
        let valueA = a.value;
        let valueB = b.value;
        if (typeof(a) === DataType.String) {
            valueA = a.value.toUpperCase();
            valueB = b.value.toUpperCase();
        }
        if (valueA < valueB) {
            return -1;
        } else if (valueA > valueB) {
            return 1;
        } else {
            return 0;
        }
    }

    private selectAllFilterItems() {
        this.listData.forEach(filterListItem => {
            filterListItem.isSelected = true;
            filterListItem.indeterminate = false;
        });
        this.excelStyleSearch.cdr.detectChanges();
    }

    // TODO: sort members by access modifier

    /**
     * @hidden @internal
     */
    get sortingTemplate() {
        if (this.grid.excelStyleSortingTemplateDirective) {
            return this.grid.excelStyleSortingTemplateDirective.template;
        } else {
            return this.defaultExcelStyleSortingTemplate;
        }
    }

    /**
     * @hidden @internal
     */
    get movingTemplate() {
        if (this.grid.excelStyleMovingTemplateDirective) {
            return this.grid.excelStyleMovingTemplateDirective.template;
        } else {
            return this.defaultExcelStyleMovingTemplate;
        }
    }

    /**
     * @hidden @internal
     */
    get pinningTemplate() {
        if (this.grid.excelStylePinningTemplateDirective) {
            return this.grid.excelStylePinningTemplateDirective.template;
        } else {
            return this.defaultExcelStylePinningTemplate;
        }
    }

    /**
     * @hidden @internal
     */
    get hidingTemplate() {
        if (this.grid.excelStyleHidingTemplateDirective) {
            return this.grid.excelStyleHidingTemplateDirective.template;
        } else {
            return this.defaultExcelStyleHidingTemplate;
        }
    }

    /**
     * @hidden @internal
     */
    get applyButtonDisabled() {
        return this.listData[0] && !this.listData[0].isSelected && !this.listData[0].indeterminate;
    }

    /**
     * @hidden @internal
     */
    public applyFilter() {
        const filterTree = new FilteringExpressionsTree(FilteringLogic.Or, this.column.field);
        const selectedItems = this.listData.slice(1, this.listData.length).filter(el => el.isSelected === true);
        const unselectedItem = this.listData.slice(1, this.listData.length).find(el => el.isSelected === false);

        if (unselectedItem) {
            if (selectedItems.length <= IgxGridExcelStyleFilteringComponent.filterOptimizationThreshold) {
                selectedItems.forEach(element => {
                    let condition = null;
                    if (element.value !== null && element.value !== undefined) {
                        if (this.column.dataType === DataType.Boolean) {
                            condition = this.createCondition(element.value.toString());
                        } else {
                            condition = this.createCondition('equals');
                        }
                    } else {
                        condition = this.createCondition('empty');
                    }
                    filterTree.filteringOperands.push({
                        condition: condition,
                        fieldName: this.column.field,
                        ignoreCase: this.column.filteringIgnoreCase,
                        searchVal: element.value
                    });
                });
            } else {
                const blanksItemIndex = selectedItems.findIndex(e => e.value === null || e.value === undefined);
                let blanksItem: any;
                if (blanksItemIndex >= 0) {
                    blanksItem = selectedItems[blanksItemIndex];
                    selectedItems.splice(blanksItemIndex, 1);
                }

                filterTree.filteringOperands.push({
                    condition: this.createCondition('in'),
                    fieldName: this.column.field,
                    ignoreCase: this.column.filteringIgnoreCase,
                    searchVal: new Set(this.column.dataType === DataType.Date ?
                        selectedItems.map(d => new Date(d.value.getFullYear(), d.value.getMonth(), d.value.getDate()).toISOString()) :
                        selectedItems.map(e => e.value))
                });

                if (blanksItem) {
                    filterTree.filteringOperands.push({
                        condition: this.createCondition('empty'),
                        fieldName: this.column.field,
                        ignoreCase: this.column.filteringIgnoreCase,
                        searchVal: blanksItem.value
                    });
                }
            }

            this.filteringService.filterInternal(this.column.field, filterTree);
            this.expressionsList = new Array<ExpressionUI>();
            this.filteringService.generateExpressionsList(this.column.filteringExpressionsTree,
                this.grid.filteringLogic, this.expressionsList);
        } else {
            this.filteringService.clearFilter(this.column.field);
        }

        this.closeDropdown();
    }

    /**
     * @hidden @internal
     */
    public cancel() {
        if (!this.overlayComponentId) {
            this.init();
        }
        this.closeDropdown();
    }

    private closeDropdown() {
        if (this.overlayComponentId) {
            this.overlayService.hide(this.overlayComponentId);
            this.overlayComponentId = null;
        }
    }

    /**
     * @hidden @internal
     */
    public onKeyDown(eventArgs) {
        if (eventArgs.key === KEYS.ESCAPE || eventArgs.key === KEYS.ESCAPE_IE) {
            this.closeDropdown();
        }
        eventArgs.stopPropagation();
    }

    /**
     * @hidden @internal
     */
    public clearFilter() {
        this.filteringService.clearFilter(this.column.field);
        this.selectAllFilterItems();
    }

    /**
     * @hidden @internal
     */
    public onClearFilterKeyDown(eventArgs) {
        if (eventArgs.key === KEYS.ENTER) {
            this.clearFilter();
        }
    }

    /**
     * @hidden @internal
     */
    public showCustomFilterItem(): boolean {
        const exprTree = this.column.filteringExpressionsTree;
        return exprTree && exprTree.filteringOperands && exprTree.filteringOperands.length &&
            !((exprTree.filteringOperands[0] as IFilteringExpression).condition &&
            (exprTree.filteringOperands[0] as IFilteringExpression).condition.name === 'in');
    }

    private createCondition(conditionName: string) {
        switch (this.column.dataType) {
            case DataType.Boolean:
                return IgxBooleanFilteringOperand.instance().condition(conditionName);
            case DataType.Number:
                return IgxNumberFilteringOperand.instance().condition(conditionName);
            case DataType.Date:
                return IgxDateFilteringOperand.instance().condition(conditionName);
            default:
                return IgxStringFilteringOperand.instance().condition(conditionName);
        }
    }
}
