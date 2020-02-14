import { Pipe, PipeTransform } from '@angular/core';
import { FilterListItem, IgxGridExcelStyleFilteringComponent } from './grid.excel-style-filtering.component';
import { cloneArray } from '../../../core/utils';

/**
 * @hidden
 */
@Pipe({
    name: 'excelStyleSearchFilter'
})
export class IgxExcelStyleSearchFilterPipe implements PipeTransform {
    transform(items: FilterListItem[], searchText: string): any[] {
        if (!items || !items.length) {
            return [];
        }

        if (!searchText) {
            return items;
        }

        searchText = searchText.toLowerCase();
        const result = items.filter((it, i) => (i === 0 && it.isSpecial) ||
            (it.value !== null && it.value !== undefined) &&
            it.value.toString().toLowerCase().indexOf(searchText) > -1);

        // If 'result' contains the 'Select All' item and at least one more - we use it, otherwise we use an empty array.
        return result.length > 1 ? result : [];
    }
}
