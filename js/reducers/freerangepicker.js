/**
 * Copyright 2024, GeoSolutions Sas.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
*/
// import { LAYER_LOADING, LAYER_LOAD, LAYER_ERROR} from '@mapstore/actions/layers';
import { DEFAULT_DATA_INIZIO, DEFAULT_DATA_FINE } from '../utils/ManageDateUtils';
import {FROMDATA_CHANGED, TODATA_CHANGED, OPEN_ALERT, CLOSE_ALERT, PLUGIN_NOT_LOADED,
    PLUGIN_LOADED, COLLAPSE_RANGE_PICKER} from '../actions/freerangepicker';
import { FETCHED_AVAILABLE_DATES, UPDATE_DATES_LAYER } from '../actions/updateDatesParams';
import moment from 'moment';
import momentLocaliser from 'react-widgets/lib/localizers/moment';
momentLocaliser(moment);

const defaultState = {
    isCollapsedPlugin: false,
    fromData: moment(DEFAULT_DATA_FINE).clone().subtract(10, 'days').startOf('day').toDate(),
    toData: DEFAULT_DATA_FINE,
    fromDataLayer: moment(DEFAULT_DATA_FINE).clone().subtract(10, 'days').startOf('day').toDate(),
    toDataLayer: DEFAULT_DATA_FINE,
    showModal: false,
    imgSrc: "",
    alertMessage: null,
    isPluginLoaded: false,
    firstAvailableDate: DEFAULT_DATA_INIZIO,
    lastAvailableDate: DEFAULT_DATA_FINE
};

function freerangepicker(state = defaultState, action) {
    switch (action.type) {
    case FROMDATA_CHANGED:
        return {
            ...state,
            fromData: action.fromData,
            toData: state.toData,
            map: state.map
        };
    case TODATA_CHANGED:
        return {
            ...state,
            fromData: state.fromData,
            toData: action.toData,
            map: state.map
        };
    case OPEN_ALERT:
        return {
            ...state,
            alertMessage: action.alertMessage
        };
    case CLOSE_ALERT:
        return {
            ...state,
            alertMessage: null
        };
    case UPDATE_DATES_LAYER:
        return {
            ...state,
            fromDataLayer: new Date(action.fromDataLayer),
            toDataLayer: new Date(action.toDataLayer)
        };
    case COLLAPSE_RANGE_PICKER:
        return {
            ...state,
            isCollapsedPlugin: !state.isCollapsedPlugin
        };
    case PLUGIN_LOADED:
        return {
            ...state,
            isPluginLoaded: true,
            variabiliMeteo: action.variabiliMeteo
        };
    case PLUGIN_NOT_LOADED:
        return {
            ...state,
            isPluginLoaded: false
        };
    case FETCHED_AVAILABLE_DATES:
        const newDataFine = action.dataFine || DEFAULT_DATA_FINE;
        const newDataInizio = action.dataInizio || DEFAULT_DATA_INIZIO;
        return {
            ...state,
            firstAvailableDate: newDataInizio,
            lastAvailableDate: newDataFine
        };
    default:
        return state;
    }
}

export default freerangepicker;
