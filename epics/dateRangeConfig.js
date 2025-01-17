/*
 * Copyright 2024, Riccardo Mari - CNR-Ibimet - Consorzio LaMMA.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
*/
import { Observable } from 'rxjs';
import { zip } from 'rxjs/observable/zip';
import { MAP_CONFIG_LOADED } from '@mapstore/actions/config';
import { updateSettings, updateNode } from '@mapstore/actions/layers';
import { FETCHED_AVAILABLE_DATES, fetchSelectDate } from '../actions/updateDatesParams';
import { FIXEDRANGE_CHECK_FETCH_SELECT_DATE, TOGGLE_PLUGIN, changePeriod, changePeriodToData } from '../actions/fixedrangepicker';
import { FREERANGE_CHECK_FETCH_SELECT_DATE, changeFromData, changeToData  } from '../actions/freerangepicker';
import DateAPI from '../utils/ManageDateUtils';
import { getVisibleLayers, FIXED_RANGE, FREE_RANGE } from '@js/utils/VariabiliMeteoUtils';
import moment from 'moment';
import momentLocaliser from 'react-widgets/lib/localizers/moment';
momentLocaliser(moment);

const COMBINED_DATE_MAPCONFIG = 'COMBINED_DATE_MAPCONFIG';

const updateLayersParams = (layers, toData) => {
    let actionsUpdateParams = [];
    const toDataFormatted = moment(toData).format();
    const fromDataFormatted = moment(toData).clone().subtract(1, 'month').format();
    for (const layer of layers) {
        if (layer.params) {
            const mapFileName = DateAPI.setGCMapFile(
                fromDataFormatted,
                toDataFormatted,
                layer.params.map
            );
            const newParams = {
                params: {
                    map: mapFileName,
                    fromData: fromDataFormatted,
                    toData: toDataFormatted
                }
            };
            actionsUpdateParams.push(updateSettings(newParams));
            actionsUpdateParams.push(updateNode(layer.id, "layers", newParams));
        }
    }
    // Returns action for updated layers
    return actionsUpdateParams;
};


const updateParamsByDateRangeEpic = (action$, store) =>
    action$.ofType(COMBINED_DATE_MAPCONFIG)
        .switchMap((action) => {
            const appState = store.getState();
            if (!appState.fixedrangepicker?.isPluginLoaded && !appState.freerangepicker?.isPluginLoaded) {
                return Observable.empty();
            }
            const layers = action.payload.config?.map?.layers;
            const toData = action.payload.availableDate;
            const actionsUpdateParams = updateLayersParams(layers, toData);
            return Observable.of(...actionsUpdateParams);
        });

const combinedDateMapConfigEpic = (action$) => {
    const availableDate$ = action$.ofType(FETCHED_AVAILABLE_DATES);

    const mapConfigLoaded$ = action$.ofType(MAP_CONFIG_LOADED);

    return zip(
        availableDate$,
        mapConfigLoaded$
    ).map(([availableDateAction, mapConfigAction]) => ({
        type: COMBINED_DATE_MAPCONFIG,
        payload: {
            availableDate: availableDateAction.dataFine,
            config: mapConfigAction.config
        }
    }));
};


// Function to get the layer configuration based on the date range
// const getMapLayersConfiguration = (configName, toData) => {
//     return axios.get(configName).then((response) => {
//         if (response.data && typeof response.data === 'object' && response.data.map?.layers) {
//             const toDataFormatted = moment(toData).format('YYYY-MM-DD');
//             const fromDataFormatted = moment(toData).clone().subtract(1, 'month').format('YYYY-MM-DD');
//             const updatedLayers = response.data.map.layers.map((layer) => {
//                 if (layer.params) {
//                     const mapFileName = DateAPI.setGCMapFile(
//                         fromDataFormatted,
//                         toDataFormatted,
//                         layer.params.map
//                     );
//                     return {
//                         ...layer,
//                         params: {
//                             ...layer.params,
//                             map: mapFileName,
//                             fromData: fromDataFormatted,
//                             toData: toDataFormatted
//                         }
//                     };
//                 }
//                 return layer;
//             });
//             // Returns the new configuration with updated layers
//             return { ...response.data, map: { ...response.data.map, layers: updatedLayers } };
//         }
//         // If the response structure is invalid, throws an error
//         throw new Error(`Invalid response structure in config: ${configName}`);
//     });
// };

// Resets the plugin and application's state to default values when navigating back to the Home Page
// const restoreDefaultsOnHome = (action$, store) =>
//     action$.ofType(LOADING).switchMap(() => {
//         let rangePickerActions = [];
//         const appState = store.getState();
//         // TODO: recuperare TO_DATA con la chiamata ajax selectDate
//         const TO_DATA = moment().subtract(1, 'day').toDate();
//         const FROM_DATA = new Date(moment(TO_DATA).clone().subtract(1, 'month'));
//         rangePickerActions.push(changeFromData(FROM_DATA));
//         rangePickerActions.push(changeToData(TO_DATA));
//         rangePickerActions.push(changePeriodToData(TO_DATA));
//         rangePickerActions.push(changePeriod("1"));
//         if (appState.fixedrangepicker.showFixedRangePicker) {
//             rangePickerActions.push(toggleRangePickerPlugin());
//         }
//         if (appState.fixedrangepicker.isPluginLoaded) {
//             rangePickerActions.push(markFixedRangeAsNotLoaded());
//         }
//         if (appState.freerangepicker.isPluginLoaded) {
//             rangePickerActions.push(markFreeRangeAsNotLoaded());
//         }
//         return Observable.of(...rangePickerActions);
//     });


// const loadMapConfigByDateRangeEpic = (action$) =>
//     action$.ofType(LOAD_MAP_CONFIG)
//         .switchMap((action) => {
//             if (!action.config) {
//                 const configName = action.configName;
//                 const mapId = action.mapId;
//                 return Observable.fromPromise(getMapLayersConfiguration(configName))
//                     .switchMap((data) => Observable.of(loadMapConfig(configName, mapId, data))) // Loads the map configuration with updated layers
//                     .catch((error) => Observable.of(configureError(error.message || error, mapId))); // Handles the error
//             }
//             return Observable.empty();
//         });

const checkFetchAvailableDatesFreeRange = (action$, store) =>
    action$.ofType(FREERANGE_CHECK_FETCH_SELECT_DATE)
        .switchMap((action) => {
            const appState = store.getState();
            if (!appState.fixedrangepicker?.isPluginLoaded && !appState.infochart?.isPluginLoaded) {
                return Observable.of(fetchSelectDate(action.variableSelectDate, action.urlSelectDate, "FreeRangePlugin"));
            }
            return Observable.empty();
        });

const checkFetchAvailableDatesFixedRange = (action$, store) =>
    action$.ofType(FIXEDRANGE_CHECK_FETCH_SELECT_DATE)
        .switchMap((action) => {
            const appState = store.getState();
            if (!appState.freerangepicker?.isPluginLoaded && !appState.infochart?.isPluginLoaded) {
                return Observable.of(fetchSelectDate(action.variableSelectDate, action.urlSelectDate, "FixedRangePlugin", action.timeUnit));
            }
            return Observable.empty();
        });

/**
 * Epic that handles the toggling of a plugin based on action parameters.
 *
 * This function listens for the `TOGGLE_PLUGIN` action type and, based on the
 * `source` (either `FixedRangePlugin` or `FreeRangePlugin`), performs different operations.
 * The purpose of this epic is to set the plugin's dates.
 * If the necessary parameters (like `layerParams`) are not provided, the epic does nothing.
 *
 * - If `source` is `FIXED_RANGE`, it calculates a start and end date (using the active layer's data
 *   or a default value) and emits actions to update the dates for `FixedRangePlugin`.
 * - If `source` is `FREE_RANGE`, it only updates the end date and emits an action to modify the
 *   period for `FreeRangePlugin`.
 *
 * The function returns an Observable that emits the generated actions.
 *
 * @param {Object} action$ - Stream of incoming actions, managed by redux-observable.
 * @param {Object} store - The application state, used to access global data.
 * @returns {Observable} - Observable that emits Redux actions to modify the state.
 */
const togglePluginEpic = (action$, store) =>
    action$.ofType(TOGGLE_PLUGIN)
        .switchMap((action) => {
            if (!action.layerParams) {
                return Observable.empty();
            }
            const appState = store.getState();
            let newActions = [];
            const layers = getVisibleLayers(appState.layers.flat, action.layerParams);
            if (action.source === FIXED_RANGE) {
                const toData = layers[0]?.params?.toData || appState.fixedrangepicker.lastAvailableDate;
                const fromData = layers[0]?.params?.fromData || moment(toData).clone().subtract(1, 'month');
                // Verifica validità delle date
                if (toData && !isNaN(new Date(toData)) && fromData && !isNaN(new Date(fromData))) {
                    newActions.push(changeFromData(new Date(fromData)));
                    newActions.push(changeToData(new Date(toData)));
                }
            }
            if (action.source === FREE_RANGE) {
                const toData = layers[0]?.params?.toData || appState.freerangepicker.lastAvailableDate;
                // Verifica validità delle date
                if (toData && !isNaN(new Date(toData))) {
                    newActions.push(changePeriod("1"));
                    newActions.push(changePeriodToData(new Date(toData)));
                }
            }
            return Observable.of(...newActions);
        });


export {
    checkFetchAvailableDatesFreeRange,
    checkFetchAvailableDatesFixedRange,
    combinedDateMapConfigEpic,
    updateParamsByDateRangeEpic,
    togglePluginEpic
};
