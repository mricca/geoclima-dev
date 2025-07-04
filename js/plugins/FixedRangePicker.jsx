/**
 * Copyright 2024, Consorzio LaMMA.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */
import React from 'react';
import { createStructuredSelector } from 'reselect';
import PropTypes from 'prop-types';
import { Button, ButtonGroup, Collapse, FormGroup, Glyphicon } from 'react-bootstrap';
import Message from '@mapstore/components/I18N/Message';
import { updateSettings, updateNode } from '@mapstore/actions/layers';
import { layersSelector } from '@mapstore/selectors/layers';
import { fromDataFormSelector, fromDataLayerSelector, toDataFormSelector, toDataLayerSelector,
    isPluginLoadedSelector, showFixedRangePickerSelector, periodTypeSelector,
    firstAvailableDateSelector, lastAvailableDateSelector, isCollapsedPluginSelector } from '../selectors/fixedRangePicker';
import { compose } from 'redux';
import { changePeriodToData, changePeriod, toggleRangePickerPlugin, openAlert,
    closeAlert, collapsePlugin, markFixedRangeAsLoaded, markFixedRangeAsNotLoaded } from '../actions/fixedrangepicker';
import { fetchSelectDate } from '@js/actions/updateDatesParams';
import { isLayerLoadingSelector, exportImageApiSelector } from '../selectors/exportImage';
import { FIXED_RANGE, isVariabiliMeteoLayer } from '../utils/VariabiliMeteoUtils';
import DateAPI, { DATE_FORMAT, DEFAULT_DATA_INIZIO, DEFAULT_DATA_FINE } from '../utils/ManageDateUtils';
import { connect } from 'react-redux';
import assign from 'object-assign';
import { createPlugin } from '@mapstore/utils/PluginsUtils';
import './rangepicker.css';
import RangePickerInfo from '../components/datepickers/RangePickerInfo';
import FixedRangeManager from '../components/datepickers/FixedRangeManager';
import DailyManager from '@js/components/datepickers/DailyManager';

import fixedrangepicker from '../reducers/fixedrangepicker';
import layers from '@mapstore/reducers/layers';

import * as rangePickerEpics from '../epics/dateRangeConfig';
import moment from 'moment';
import momentLocaliser from 'react-widgets/lib/localizers/moment';
momentLocaliser(moment);

/*
Plugin configuration
"name": "FixedRangePicker",
          "defaultConfig" : {
        "id": "mapstore-fixedrangepicker-map",
        "defaultUrlSelectDate": "geoportale.lamma.rete.toscana.it/cgi-bin/geoclima_app/selectDate.py",
        "variabileSelectDate": "prec",
        "isFetchAvailableDates": true,
        "checkPrefixes": false,
        "periodTypes": [
            { "key": 7, "label": "7 giorni", "max": 6 },
            { "key": 10, "label": "10 giorni", "max": 9, "isDefault": true  },
            { "key": 30, "label": "30 giorni", "max": 29 },
            { "key": 120, "label": "90 giorni", "max": 89 },
            { "key": 180, "label": "180 giorni", "max": 179 },
            { "key": 365, "label": "365 giorni", "max": 364 }
        ],
        "variabiliMeteo": {
          "precipitazione": [
            "Pioggia_Anomalia_perc",
            "Pioggia_Anomalia_mm",
            "Pioggia_Cumulata",
            "Pioggia_Cumulata_clima",
            "Pioggia_Cumulata_Giornaliera",
            "Prec_stazioni",
            "Prec_stazioni_non_utilizzate"
          ],
          "temperatura": [
            "Temperatura_Media",
            "Temperatura_Media_Anomalia",
            "Temperatura_Minima",
            "Temperatura_Minima_Anomalia",
            "Temperatura_Massima",
            "Temperatura_Massima_Anomalia",
            "Temperatura_Media_clima",
            "Temperatura_Massima_clima",
            "Temperatura_Minima_clima",
            "Temperatura_Minima_Giornaliera",
            "Tmin_stazioni",
            "Tmin_stazioni_non_utilizzate",
            "Temperatura_Massima_Giornaliera",
            "Tmax_stazioni",
            "Tmax_stazioni_non_utilizzate",
            "Velocita_vento_giornaliera",
            "Vven_stazioni",
            "Vven_stazioni_non_utilizzate",
            "Umidita_media_giornaliera",
            "Umid_stazioni",
            "Umid_stazioni_non_utilizzate",
            "Pressione_Mare_Giornaliera",
            "Pressione_Suolo_Giornaliera",
            "Mslp_stazioni",
            "Mslp_stazioni_non_utilizzate",
            "Radiazione_Globale_Giornaliera",
            "Evapotraspirazione_Potenziale_Giornaliera"
          ],
          "evapotraspirazione": [
            "Evapotraspirazione",
            "Evapotraspirazione_Anomalia_mm",
            "Evapotraspirazione_Anomalia_perc",
            "Evapotraspirazione_clima"
          ],
          "bilancioIdricoSemplificato": [
            "BilancioIdricoSemplificato",
            "BilancioIdricoSemplificato_Anomalia_mm",
            "BilancioIdricoSemplificato_Anomalia_perc",
            "BilancioIdricoSemplificato_clima"
          ],
          "spi": [
            "spi1",
            "spi3",
            "spi6",
            "spi12"
          ],
          "spei": [
            "spei1",
            "spei3",
            "spei6",
            "spei12"
          ]
        },
        "timeUnit": "YYYY-MM-DD",
        "showOneDatePicker": false
      }
*/
class FixedRangePicker extends React.Component {
    static propTypes = {
        id: PropTypes.string,
        className: PropTypes.string,
        defaultUrlSelectDate: PropTypes.string,
        firstAvailableDate: PropTypes.instanceOf(Date),
        fromData: PropTypes.instanceOf(Date),
        fromDataLayer: PropTypes.instanceOf(Date),
        isCollapsedPlugin: PropTypes.bool,
        isFetchAvailableDates: PropTypes.bool, // If true, fetch the first and last available dates calling fetchSelectDate action
        checkPrefixes: PropTypes.bool,
        isInteractionDisabled: PropTypes.bool,
        isLayerLoading: PropTypes.bool,
        isPluginLoaded: PropTypes.bool,
        lastAvailableDate: PropTypes.instanceOf(Date),
        onChangePeriodToData: PropTypes.func,
        onChangePeriod: PropTypes.func,
        onCollapsePlugin: PropTypes.func,
        onFetchAvailableDates: PropTypes.func,
        onSetSelectDate: PropTypes.func,
        onUpdateSettings: PropTypes.func,
        onUpdateNode: PropTypes.func,
        onMarkPluginAsLoaded: PropTypes.func,
        onMarkFixedRangeAsNotLoaded: PropTypes.func,
        onToggleFixedRangePicker: PropTypes.func,
        variabileSelectDate: PropTypes.string,
        layers: PropTypes.object,
        variabiliMeteo: PropTypes.object,
        periodType: PropTypes.object,
        periodTypes: PropTypes.array,
        showFixedRangePicker: PropTypes.bool, // If true, show this plugin; otherwise, show FreeRangePlugin if inserted in context
        alertMessage: PropTypes.string,
        onOpenAlert: PropTypes.func,
        onCloseAlert: PropTypes.func,
        settings: PropTypes.object,
        shiftDown: PropTypes.bool,
        shiftRight: PropTypes.bool,
        showOneDatePicker: PropTypes.bool, // true when the FixedRange plugin is loaded in "One Date Picker" mode.
        showChangeRangePickerButton: PropTypes.bool,
        style: PropTypes.object,
        timeUnit: PropTypes.string,
        toData: PropTypes.instanceOf(Date),
        toDataLayer: PropTypes.instanceOf(Date)
    };
    static defaultProps = {
        isCollapsedPlugin: true,
        onChangePeriodToData: () => { },
        onChangePeriod: () => { },
        onUpdateSettings: () => { },
        onCollapsePlugin: () => { },
        onMarkFixedRangeAsNotLoaded: () => { },
        periodType: { key: 10, label: "20 giorni", min: 9, max: 20, isDefault: true },
        periodTypes: [
            { key: 1, label: "5 giorni", min: 1, max: 5, isDefault: true },
            { key: 7, label: "8 giorni", min: 6, max: 8 },
            { key: 10, label: "20 giorni", min: 9, max: 20, isDefault: true },
            { key: 30, label: "60 giorni", min: 21, max: 60 },
            { key: 120, label: "160 giorni", min: 61, max: 160 },
            { key: 180, label: "250 giorni", min: 161, max: 250 },
            { key: 365, label: "366 giorni", min: 251, max: 366 }
        ],
        id: "mapstore-fixederange",
        variabiliMeteo: {
            "precipitazione": ["Pioggia_Anomalia_perc", "Pioggia_Anomalia_mm", "Pioggia_Cumulata", "Pioggia_Cumulata_clima", "Pioggia_Cumulata_Giornaliera"],
            "temperatura": ["Temperatura_Media", "Temperatura_Media_Anomalia", "Temperatura_Minima", "Temperatura_Minima_Anomalia",
                "Temperatura_Massima", "Temperatura_Massima_Anomalia", "Temperatura_Media_clima", "Temperatura_Massima_clima", "Temperatura_Minima_clima"],
            "evapotraspirazione": ["Evapotraspirazione", "Evapotraspirazione_Anomalia_mm", "Evapotraspirazione_Anomalia_perc", "Evapotraspirazione_clima"],
            "bilancioIdricoSemplificato": ["BilancioIdricoSemplificato", "BilancioIdricoSemplificato_Anomalia_mm", "BilancioIdricoSemplificato_Anomalia_perc",
                "BilancioIdricoSemplificato_clima"],
            "spi": [ "spi1", "spi3", "spi6", "spi12"],
            "spei": [ "spei1", "spei3", "spei6", "spei12"]
        },
        defaultUrlSelectDate: "geoportale.lamma.rete.toscana.it/cgi-bin/geoclima_app/selectDate.py",
        checkPrefixes: false,
        variabileSelectDate: "prec",
        className: "mapstore-fixederange",
        style: {
            position: 'absolute',
            zIndex: 10
        },
        showFixedRangePicker: false,
        showOneDatePicker: false,
        alertMessage: null,
        isInteractionDisabled: true,
        shiftRight: false,
        shiftDown: false,
        showChangeRangePickerButton: false,
        firstAvailableDate: DEFAULT_DATA_INIZIO,
        lastAvailableDate: DEFAULT_DATA_FINE,
        isPluginLoaded: false,
        timeUnit: DATE_FORMAT
    };

    componentDidMount() {
        const defaultPeriod = DateAPI.getDefaultPeriod(this.props.periodTypes);
        this.props.onChangePeriod(defaultPeriod);
        this.props.onToggleFixedRangePicker();
        this.props.onMarkPluginAsLoaded(this.props.showOneDatePicker, this.props.checkPrefixes, this.props.variabiliMeteo);
        if ( this.props.isFetchAvailableDates && this.props.defaultUrlSelectDate && this.props.variabileSelectDate) {
            this.props.onFetchAvailableDates(this.props.variabileSelectDate, this.props.defaultUrlSelectDate, this.props.timeUnit, defaultPeriod);
        }
    }

    // Resets the plugin's state to default values when navigating back to the Home Page
    componentWillUnmount() {
        const TO_DATA = this.props.lastAvailableDate;
        this.props.onChangePeriodToData(TO_DATA);
        this.props.onChangePeriod(DateAPI.getDefaultPeriod(this.props.periodTypes));
        this.props.onMarkFixedRangeAsNotLoaded();
        if (this.props.showFixedRangePicker) {
            this.props.onToggleFixedRangePicker();
        }
        if (this.props.alertMessage !== null) {
            this.props.onCloseAlert();
        }
        if (this.props.isCollapsedPlugin) {
            this.props.onCollapsePlugin();
        }
    }

    render() {
        if (!this.props.showFixedRangePicker) {
            return null;
        }
        const pluginStyle = {
            ...(this.props.shiftRight ? { left: '305px' } : {}),
            ...(this.props.shiftDown ? { top: '100px' } : {}),
            ...this.props.style
        };
        const rotateIcon = this.props.isCollapsedPlugin ? 'rotate(180deg)' : 'rotate(0deg)';
        return (
            <div className="ms-fixedrangepicker-action" style={pluginStyle}>
                <Button  onClick= {this.props.onCollapsePlugin} style={this.props.style}>
                    <Message msgId={!this.props.showOneDatePicker
                        ? "gcapp.fixedRangePicker.collapsePlugin"
                        : "gcapp.dailyDatePicker"}  />{' '}
                    <span className="collapse-rangepicker-icon" style={{ transform: rotateIcon }}>&#9650;</span>
                </Button>
                <Collapse in={!this.props.isCollapsedPlugin} style={{ zIndex: 100,  position: "absolute", top: "30px",
                    boxShadow: "0 14px 28px rgba(0, 0, 0, 0.25), 0 10px 10px rgba(0, 0, 0, 0.22)", backgroundColor: "#FFFFFF"  }}>
                    <FormGroup style={{ marginBottom: "0px" }} bsSize="sm">
                        {
                            !this.props.showOneDatePicker
                                ? this.showFixedRangeManager()
                                : this.showDailyDatePicker()
                        }
                        {this.props.alertMessage && (
                            <div className="alert-date" >
                                <strong><Message msgId="warning"/></strong>
                                <span ><Message msgId={this.props.alertMessage}
                                    msgParams={{minDate: moment(this.props.firstAvailableDate).format(this.props.timeUnit),
                                        maxDate: moment(this.props.lastAvailableDate).format(this.props.timeUnit)
                                    }}/></span>
                            </div>
                        )}
                    </FormGroup>
                </Collapse>
            </div>
        );
    }
    // The plugin is loaded in "Date Range Picker" mode.
    showFixedRangeManager = () => {
        return (
            <div className="ms-fixedrangepicker-action">
                <RangePickerInfo
                    labelTitleId="gcapp.fixedRangePicker.titlePeriod"
                    fromData={this.props.fromDataLayer}
                    toData={this.props.toDataLayer}
                    format={this.props.timeUnit}
                    isInteractionDisabled={this.props.isLayerLoading}
                />
                <FixedRangeManager
                    minDate={this.props.firstAvailableDate}
                    maxDate={this.props.lastAvailableDate}
                    toData={this.props.toData}
                    onChangeToData={this.handleChangeToData}
                    isInteractionDisabled={this.props.isInteractionDisabled}
                    periodType={this.props.periodType}
                    periodTypes={this.props.periodTypes}
                    format={this.props.timeUnit}
                    onChangePeriod={this.handleChangePeriodType}
                    styleLabels="labels-fixedrangepicker"
                    classAttribute="ms-fixedrangepicker-action"
                />
                <ButtonGroup id="button-rangepicker-container">
                    <Button onClick={() => this.handleApplyPeriod()} disabled={this.props.isInteractionDisabled}>
                        <Glyphicon glyph="calendar" /><Message msgId="gcapp.applyPeriodButton" />
                    </Button>
                    { this.props.showChangeRangePickerButton && (
                        <Button onClick={() => this.props.onToggleFixedRangePicker(this.props.variabiliMeteo, FIXED_RANGE, DateAPI.getDefaultPeriod(this.props.periodTypes))} disabled={this.props.isInteractionDisabled}>
                            <Message msgId="gcapp.fixedRangePicker.dateRangeButton" />
                        </Button>
                    )}
                </ButtonGroup>
            </div>
        );
    }
    // The plugin is loaded in "One Date Picker" mode.
    showDailyDatePicker = () => {
        return (
            <DailyManager
                toData={this.props.toData}
                minDate={this.props.firstAvailableDate}
                maxDate={this.props.lastAvailableDate}
                isInteractionDisabled={this.props.isInteractionDisabled}
                isLayerLoading={this.props.isLayerLoading}
                onChangePeriodToData={this.props.onChangePeriodToData}
                updateParams={this.updateParams}
                alertMessage={this.props.alertMessage}
                onOpenAlert={this.props.onOpenAlert}
                onCloseAlert={this.props.onCloseAlert}
                format={ this.props.timeUnit }
                defaultPeriod={ this.props.periodTypes.find(period => period.isDefault) }
            />
        );
    }
    handleChangePeriodType = (newPeriodType) => {
        this.props.onChangePeriod(newPeriodType);
        this.handleApplyPeriod(newPeriodType, this.props.toData);
    }
    handleChangeToData = (newToData) => {
        this.props.onChangePeriodToData(newToData);
        this.handleApplyPeriod(this.props.periodType, newToData);
    }
    handleApplyPeriod = (newPeriodType, newToData) => {
        if (!newPeriodType || !newToData || isNaN(newToData) || !(newToData instanceof Date)) {
            this.props.onChangePeriodToData(this.props.toDataLayer); // ripristina i valori di default
            return;
        }
        const newFromData = moment(newToData).clone().subtract(Number(newPeriodType.max), 'days').toDate();
        const mapNameSuffix = newPeriodType.key;
        // Verifica dell'intervallo di date
        const validation = DateAPI.validateDateRange(newFromData, newToData,
            this.props.firstAvailableDate, this.props.lastAvailableDate, this.props.timeUnit
        );
        if (!validation.isValid) {
            this.props.onOpenAlert("gcapp.errorMessages." + validation.errorMessage);
            return;
        }
        if (this.props.alertMessage !== null) {
            this.props.onCloseAlert();
        }
        this.updateParams({
            fromData: newFromData,
            toData: newToData,
            mapNameSuffix
        });
    }
    /**
     * Updates meteorological layers based on the selected dates.
     * If `checkPrefixes` is true, updates the layer's name, title, and passes only the `map` param.
     * Otherwise, updates the `map`, `fromData`, and `toData` params using the standard logic.
     */
    updateParams = (datesParam, onUpdateNode = true) => {
        this.props.layers.map((layer) => {
            if (onUpdateNode && isVariabiliMeteoLayer(layer.name, this.props.variabiliMeteo, this.props.checkPrefixes)) {
                const name = layer?.name || "";

                // === 1. Caso: layer con nome che inizia con uno dei prefissi ===
                if (this.props.checkPrefixes) {
                    const year = moment(moment(datesParam.toData).format(this.props.timeUnit)).format("YYYY");
                    const nameBase = name.replace(/_\d{4}-\d{2}-\d{2}$/, "");
                    const updatedName = `${nameBase}_${moment(datesParam.toData).format(this.props.timeUnit)}`;
                    const updatedTitle = `${layer.title?.split("–")[0].trim()} – ${moment(datesParam.toData).format(this.props.timeUnit)}`;

                    const originalMap = layer.params?.map || "";
                    const updatedMap = originalMap
                        .replace(/wms_\d{4}/, `wms_${year}`)
                        .replace(/\d{4}-\d{2}-\d{2}/, moment(datesParam.toData).format(this.props.timeUnit));

                    this.props.onUpdateNode(layer.id, "layer", {
                        title: updatedTitle,
                        name: updatedName,
                        description: updatedTitle,
                        params: {
                            // LAYERS: `${updatedName}`,
                            map: updatedMap
                        }
                    });

                } else {
                    // === 2. Caso: layer con params.map (logica originale)
                    const mapFile = !this.props.showOneDatePicker ?
                        DateAPI.getMapfilenameFromSuffix(layer.params.map, datesParam.mapNameSuffix)
                        : layer.params.map;
                    const newParams = {
                        params: {
                            map: mapFile,
                            fromData: moment(datesParam.fromData).format(this.props.timeUnit),
                            toData: moment(datesParam.toData).format(this.props.timeUnit)
                        }
                    };
                    this.props.onUpdateSettings(newParams);
                    this.props.onUpdateNode(
                        layer.id,
                        "layers",
                        assign({}, this.props.settings.props, newParams)
                    );
                }
            }
        });
    }
}

const mapStateToProps = createStructuredSelector({
    isCollapsedPlugin: isCollapsedPluginSelector,
    fromData: fromDataFormSelector,
    fromDataLayer: fromDataLayerSelector,
    periodType: periodTypeSelector,
    settings: (state) => state?.layers?.settings || { expanded: false, options: { opacity: 1 } },
    layers: layersSelector,
    showFixedRangePicker: (state) => !!state?.fixedrangepicker?.showFixedRangePicker,
    alertMessage: (state) => state?.fixedrangepicker?.alertMessage || null,
    isInteractionDisabled: (state) => isLayerLoadingSelector(state) || exportImageApiSelector(state),
    isLayerLoading: isLayerLoadingSelector,
    shiftRight: (state) => !!state?.controls?.drawer?.enabled,
    shiftDown: (state) => !!state?.controls?.search?.enabled,
    showChangeRangePickerButton: showFixedRangePickerSelector,
    isPluginLoaded: isPluginLoadedSelector,
    firstAvailableDate: firstAvailableDateSelector,
    lastAvailableDate: lastAvailableDateSelector,
    toData: toDataFormSelector,
    toDataLayer: toDataLayerSelector
});

const FixedRangePickerPlugin = connect(mapStateToProps, {
    onMarkPluginAsLoaded: markFixedRangeAsLoaded,
    onMarkFixedRangeAsNotLoaded: markFixedRangeAsNotLoaded,
    onCollapsePlugin: collapsePlugin,
    onChangePeriodToData: compose(changePeriodToData, (event) => event),
    onChangePeriod: changePeriod,
    onUpdateSettings: updateSettings,
    onUpdateNode: updateNode,
    onToggleFixedRangePicker: toggleRangePickerPlugin,
    onOpenAlert: openAlert,
    onCloseAlert: closeAlert,
    onFetchAvailableDates: fetchSelectDate
})(FixedRangePicker);

export default createPlugin(
    'FixedRangePickerPlugin',
    {
        component: assign(FixedRangePickerPlugin, {
            GridContainer: {
                id: 'fixedRangePicker',
                name: 'fixedRangePicker',
                tool: true,
                position: 1,
                priority: 1
            }
        }),
        reducers: {
            fixedrangepicker: fixedrangepicker,
            layers: layers
        },
        epics: rangePickerEpics
    }
);
