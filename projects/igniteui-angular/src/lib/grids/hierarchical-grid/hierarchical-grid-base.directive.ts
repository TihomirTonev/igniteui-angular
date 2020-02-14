import {
    ElementRef,
    NgZone,
    ChangeDetectorRef,
    IterableDiffers,
    ViewContainerRef,
    Inject,
    ComponentFactoryResolver,
    Optional,
    Input,
    ViewChild,
    TemplateRef,
    Directive
} from '@angular/core';
import { IgxGridBaseDirective, IgxGridTransaction } from '../grid-base.directive';
import { GridBaseAPIService } from '../api.service';
import { IgxHierarchicalGridAPIService } from './hierarchical-grid-api.service';
import { IgxRowIslandComponent } from './row-island.component';
import { IgxFilteringService } from '../filtering/grid-filtering.service';
import { IDisplayDensityOptions, DisplayDensityToken } from '../../core/displayDensity';
import { IgxSummaryOperand } from '../summaries/grid-summary';
import { IgxOverlayService, IgxTransactionService, Transaction, TransactionService, State } from '../../services/index';
import { DOCUMENT } from '@angular/common';
import { IgxHierarchicalGridNavigationService } from './hierarchical-grid-navigation.service';
import { IgxGridSummaryService } from '../summaries/grid-summary.service';
import { IgxGridSelectionService, IgxGridCRUDService } from '../selection/selection.service';
import { IgxChildGridRowComponent } from './child-grid-row.component';
import { IgxColumnResizingService } from '../resizing/resizing.service';
import { GridType } from '../common/grid.interface';
import { IgxColumnGroupComponent } from '../columns/column-group.component';
import { IgxColumnComponent } from '../columns/column.component';

export const IgxHierarchicalTransactionServiceFactory = {
    provide: IgxGridTransaction,
    useFactory: hierarchicalTransactionServiceFactory
};

export function hierarchicalTransactionServiceFactory() {
    return new IgxTransactionService();
}

export interface IPathSegment {
    rowID: any;
    rowIslandKey: string;
}

@Directive({
    selector: '[igxHierarchicalGridBase]'
})
export class IgxHierarchicalGridBaseDirective extends IgxGridBaseDirective {
    public rootGrid;

    @Input()
    public expandChildren: boolean;

    @Input()
    public hasChildrenKey: string;

    @Input()
    public showExpandAll = false;

    /**
     * @hidden
     */
    get maxLevelHeaderDepth() {
        if (this._maxLevelHeaderDepth === null) {
            this._maxLevelHeaderDepth = this.columnList.reduce((acc, col) => Math.max(acc, col.level), 0);
        }
        return this._maxLevelHeaderDepth;
    }

     /**
     * @hidden
     */
    protected get outlet() {
        return this.rootGrid ? this.rootGrid.outletDirective : this.outletDirective;
    }

    /**
     * @hidden
     */
    public hgridAPI: IgxHierarchicalGridAPIService;

    /**
     * @hidden
     */
    public parentIsland: IgxRowIslandComponent;

    /**
     * @hidden
    */
    public childRow: IgxChildGridRowComponent;

    /**
     * @hidden
     * @internal
     */
    @ViewChild('dragIndicatorIconBase', { read: TemplateRef, static: true })
    public dragIndicatorIconBase: TemplateRef<any>;

    constructor(
        public selectionService: IgxGridSelectionService,
        crudService: IgxGridCRUDService,
        public colResizingService: IgxColumnResizingService,
        gridAPI: GridBaseAPIService<IgxGridBaseDirective & GridType>,
        @Inject(IgxGridTransaction) protected transactionFactory: TransactionService<Transaction, State>,
        elementRef: ElementRef,
        zone: NgZone,
        @Inject(DOCUMENT) public document,
        cdr: ChangeDetectorRef,
        resolver: ComponentFactoryResolver,
        differs: IterableDiffers,
        viewRef: ViewContainerRef,
        navigation: IgxHierarchicalGridNavigationService,
        filteringService: IgxFilteringService,
        @Inject(IgxOverlayService) protected overlayService: IgxOverlayService,
        public summaryService: IgxGridSummaryService,
        @Optional() @Inject(DisplayDensityToken) protected _displayDensityOptions: IDisplayDensityOptions) {
        super(
            selectionService,
            crudService,
            colResizingService,
            gridAPI,
            transactionFactory,
            elementRef,
            zone,
            document,
            cdr,
            resolver,
            differs,
            viewRef,
            navigation,
            filteringService,
            overlayService,
            summaryService,
            _displayDensityOptions);
        this.hgridAPI = <IgxHierarchicalGridAPIService>gridAPI;
    }

    /**
     * @hidden
     */
    public createColumnsList(cols: Array<any>) {
        const columns = [];
        const topLevelCols = this.onlyTopLevel(cols);
        topLevelCols.forEach((col) => {
            const ref = this._createColumn(col);
            ref.changeDetectorRef.detectChanges();
            columns.push(ref.instance);
        });
        const result = flatten(columns);
        this.columnList.reset(result);
        this.columnList.notifyOnChanges();
        this.initPinning();
    }

    protected _createColumn(col) {
        let ref;
        if (col instanceof IgxColumnGroupComponent) {
            ref = this._createColGroupComponent(col);
        } else {
            ref = this._createColComponent(col);
        }
        return ref;
    }

    protected _createColGroupComponent(col: IgxColumnGroupComponent) {
        const factoryGroup = this.resolver.resolveComponentFactory(IgxColumnGroupComponent);
        const ref = this.viewRef.createComponent(factoryGroup, null, this.viewRef.injector);
        ref.changeDetectorRef.detectChanges();
        factoryGroup.inputs.forEach((input) => {
            const propName = input.propName;
            (<any>ref.instance)[propName] = (<any>col)[propName];
        });
        if (col.children.length > 0) {
            const newChildren = [];
            col.children.forEach(child => {
                const newCol = this._createColumn(child).instance;
                newCol.parent = ref.instance;
                newChildren.push(newCol);
            });
            (<IgxColumnGroupComponent>ref.instance).children.reset(newChildren);
            (<IgxColumnGroupComponent>ref.instance).children.notifyOnChanges();
        }
        return ref;
    }

    protected _createColComponent(col) {
        const factoryColumn = this.resolver.resolveComponentFactory(IgxColumnComponent);
        const ref = this.viewRef.createComponent(factoryColumn, null, this.viewRef.injector);
        factoryColumn.inputs.forEach((input) => {
            const propName = input.propName;
            if (!((<any>col)[propName] instanceof IgxSummaryOperand)) {
                (<any>ref.instance)[propName] = (<any>col)[propName];
            } else {
                (<any>ref.instance)[propName] = col[propName].constructor;
            }
        });
        return ref;
    }

    protected getGridsForIsland(rowIslandID: string) {
        return this.hgridAPI.getChildGridsForRowIsland(rowIslandID);
    }

    protected getChildGrid(path: Array<IPathSegment>) {
        if (!path) {
            return;
        }
        return this.hgridAPI.getChildGrid(path);
    }
}

function flatten(arr: any[]) {
    let result = [];

    arr.forEach(el => {
        result.push(el);
        if (el.children) {
            result = result.concat(flatten(el.children.toArray()));
        }
    });
    return result;
}
