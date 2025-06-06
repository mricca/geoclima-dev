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
import { fromDataLayerSelector, toDataLayerSelector, isPluginLoadedSelector, isCollapsedPluginSelector,
    firstAvailableDateSelector, lastAvailableDateSelector, fromDataFormSelector,
    toDataFormSelector } from '../selectors/freeRangePicker';
import { compose } from 'redux';
import { exportImageApiSelector, isLayerLoadingSelector } from '../selectors/exportImage';
import DateAPI, { DATE_FORMAT, DEFAULT_DATA_FINE, DEFAULT_DATA_INIZIO} from '../utils/ManageDateUtils';
import { FREE_RANGE, isVariabiliMeteoLayer } from '../utils/VariabiliMeteoUtils';
import { connect } from 'react-redux';
import assign from 'object-assign';
import moment from 'moment';
import { createPlugin } from '@mapstore/utils/PluginsUtils';
import './rangepicker.css';

import layers from '@mapstore/reducers/layers';
import freerangepicker from '@js/reducers/freerangepicker';
import { toggleRangePickerPlugin } from '../actions/fixedrangepicker';
import { changeFromData, changeToData, openAlert, closeAlert, collapsePlugin,
    markFreeRangeAsLoaded, markFreeRangeAsNotLoaded } from '@js/actions/freerangepicker';
import { fetchSelectDate } from '@js/actions/updateDatesParams';
import * as rangePickerEpics from '../epics/dateRangeConfig';

import FreeRangeManager from '../components/datepickers/FreeRangeManager';
import RangePickerInfo from '../components/datepickers/RangePickerInfo';
import momentLocaliser from 'react-widgets/lib/localizers/moment';
momentLocaliser(moment);

/*
Plugin configuration
"name": "FreeRangePicker",
      "defaultConfig" : {
        "id": "mapstore-freerangepicker-map",
        "defaultUrlSelectDate": "geoportale.lamma.rete.toscana.it/cgi-bin/geoclima_app/selectDate.py",
        "variabileSelectDate": "prec",
        "isFetchAvailableDates": false,
        "periodTypes": [
          { "key": 1, "min": 0, "max": 5 },
          { "key": 7, "min": 6, "max": 8 },
          { "key": 10, "min": 9, "max": 20, "isDefault": true  },
          { "key": 30, "min": 21, "max": 60 },
          { "key": 120, "min": 61, "max": 160 },
          { "key": 180, "min": 161, "max": 250 },
          { "key": 365, "min": 251, "max": 366 }
      ],
        "variabiliMeteo": {
          "precipitazione": ["Pioggia_Anomalia_perc", "Pioggia_Anomalia_mm", "Pioggia_Cumulata", "Pioggia_Cumulata_clima","Pioggia_Cumulata_Giornaliera"],
          "temperatura": ["Temperatura_Media", "Temperatura_Media_Anomalia", "Temperatura_Minima", "Temperatura_Minima_Anomalia",
                  "Temperatura_Massima", "Temperatura_Massima_Anomalia", "Temperatura_Media_clima", "Temperatura_Massima_clima", "Temperatura_Minima_clima"],
          "evapotraspirazione": ["Evapotraspirazione", "Evapotraspirazione_Anomalia_mm", "Evapotraspirazione_Anomalia_perc", "Evapotraspirazione_clima"],
          "bilancioIdricoSemplificato": ["BilancioIdricoSemplificato", "BilancioIdricoSemplificato_Anomalia_mm", "BilancioIdricoSemplificato_Anomalia_perc",
                  "BilancioIdricoSemplificato_clima"],
          "spi": [ "spi1", "spi3", "spi6", "spi12"],
          "spei":[ "spei1", "spei3", "spei6", "spei12"]
        },
        "timeUnit": "YYYY-MM-DD"
      }
*/
class FreeRangePicker extends React.Component {
    static propTypes = {
        style: PropTypes.object,
        id: PropTypes.string,
        className: PropTypes.string,
        isCollapsedPlugin: PropTypes.bool,
        fromData: PropTypes.instanceOf(Date),
        fromDataLayer: PropTypes.instanceOf(Date),
        firstAvailableDate: PropTypes.instanceOf(Date),
        isFetchAvailableDates: PropTypes.bool, // If true, fetch the first and last available dates calling fetchSelectDate action
        isInteractionDisabled: PropTypes.bool,
        isLayerLoading: PropTypes.bool,
        isPluginLoaded: PropTypes.bool,
        lastAvailableDate: PropTypes.instanceOf(Date),
        onChangeFromData: PropTypes.func,
        onChangeToData: PropTypes.func,
        onCloseAlert: PropTypes.func,
        onCollapsePlugin: PropTypes.func,
        onFetchAvailableDates: PropTypes.func,
        onMarkPluginAsLoaded: PropTypes.func,
        onMarkPluginAsNotLoaded: PropTypes.func,
        onOpenAlert: PropTypes.func,
        onUpdateSettings: PropTypes.func,
        onUpdateNode: PropTypes.func,
        periodTypes: PropTypes.array,
        defaultUrlSelectDate: PropTypes.string,
        variabileSelectDate: PropTypes.string,
        layers: PropTypes.object,
        variabiliMeteo: PropTypes.object,
        showFreeRangePicker: PropTypes.bool, // serve per la visibilita del componente
        onToggleFreeRangePicker: PropTypes.func,
        alertMessage: PropTypes.string,
        shiftDown: PropTypes.bool,
        shiftRight: PropTypes.bool,
        settings: PropTypes.object,
        showChangeRangePickerButton: PropTypes.bool,
        timeUnit: PropTypes.string,
        toData: PropTypes.instanceOf(Date),
        toDataLayer: PropTypes.instanceOf(Date)
    };
    static defaultProps = {
        isCollapsedPlugin: false,
        onChangeFromData: () => {},
        onChangeToData: () => {},
        onUpdateSettings: () => {},
        onCollapsePlugin: () => { },
        id: "mapstore-daterange",
        className: "mapstore-daterange",
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
        variabileSelectDate: "prec",
        style: {
            position: 'absolute',
            zIndex: 10
        },
        showFreeRangePicker: false,
        alertMessage: null,
        isInteractionDisabled: true,
        shiftRight: false,
        shiftDown: false,
        showChangeRangePickerButton: true,
        firstAvailableDate: DEFAULT_DATA_INIZIO,
        lastAvailableDate: DEFAULT_DATA_FINE,
        timeUnit: DATE_FORMAT,
        isPluginLoaded: false
    };

    componentDidMount() {
        if (!this.props.isPluginLoaded) {
            this.props.onMarkPluginAsLoaded(this.props.variabiliMeteo);
            if ( this.props.isFetchAvailableDates && this.props.defaultUrlSelectDate && this.props.variabileSelectDate) {
                const defaultPeriod = DateAPI.getDefaultPeriod(this.props.periodTypes);
                this.props.onFetchAvailableDates(this.props.variabileSelectDate, this.props.defaultUrlSelectDate, this.props.timeUnit, defaultPeriod);
            }
        }
    }

    // Resets the plugin's state to default values when navigating back to the Home Page
    componentWillUnmount() {
        this.setDefaultDates();
        this.props.onMarkPluginAsNotLoaded();
        if (this.props.alertMessage) {
            this.props.onCloseAlert();
        }
        if (this.props.isCollapsedPlugin) {
            this.props.onCollapsePlugin();
        }
    }

    render() {
        if (!this.props.showFreeRangePicker) {
            return null;
        }
        const pluginStyle = {
            ...(this.props.shiftRight ? { left: '305px' } : {}),
            ...(this.props.shiftDown ? { top: '100px' } : {}),
            ...this.props.style
        };
        const rotateIcon = this.props.isCollapsedPlugin ? 'rotate(180deg)' : 'rotate(0deg)';
        return (
            <div className={"ms-freerangepicker-action"} style={pluginStyle}>
                <Button  onClick= {this.props.onCollapsePlugin} style={this.props.style}>
                    <Message msgId="gcapp.freeRangePicker.collapsePlugin"/>{' '}
                    <span className="collapse-rangepicker-icon" style={{ transform: rotateIcon }}>&#9650;</span>
                </Button>
                <Collapse in={!this.props.isCollapsedPlugin} style={{ zIndex: 100,  position: "absolute", top: "30px",
                    boxShadow: "0 14px 28px rgba(0, 0, 0, 0.25), 0 10px 10px rgba(0, 0, 0, 0.22)", backgroundColor: "#FFFFFF"  }}>
                    <FormGroup style={{marginBottom: "0px"}} bsSize="sm">
                        {this.showRangePicker()}
                    </FormGroup>
                </Collapse>
            </div>
        );
    }

    setDefaultDates() {
        const defaultPeriod = this.props.periodTypes.find(period => period.isDefault);
        const TO_DATA = this.props.lastAvailableDate;
        const FROM_DATA = moment(TO_DATA).clone().subtract(defaultPeriod.max, 'days').toDate();
        this.props.onChangeToData(TO_DATA);
        this.props.onChangeFromData(FROM_DATA);
    }

    showRangePicker = () => {
        return (
            <div className="ms-freerangepicker-action">
                <RangePickerInfo
                    labelTitleId="gcapp.freeRangePicker.titlePeriod"
                    fromData={this.props.fromDataLayer}
                    toData={this.props.toDataLayer}
                    format={this.props.timeUnit}
                    isInteractionDisabled={this.props.isLayerLoading}
                />
                <FreeRangeManager
                    minDate={this.props.firstAvailableDate}
                    maxDate={this.props.lastAvailableDate}
                    fromData={this.props.fromData}
                    toData={this.props.toData}
                    onChangeFromData={this.props.onChangeFromData}
                    onChangeToData={this.props.onChangeToData}
                    isInteractionDisabled={this.props.isInteractionDisabled}
                    styleLabels="labels-freerangepicker"
                    lablesType="gcapp.freeRangePicker"
                    classAttribute="ms-freerangepicker-action"
                    format={this.props.timeUnit}
                />
                <ButtonGroup id="button-rangepicker-container">
                    <Button onClick={this.handleApplyPeriod}  disabled={this.props.isInteractionDisabled}>
                        <Glyphicon glyph="calendar" /><Message msgId="gcapp.applyPeriodButton"/>
                    </Button>
                    { this.props.showChangeRangePickerButton && (
                        <Button variant="primary" onClick={() => this.props.onToggleFreeRangePicker(this.props.variabiliMeteo, FREE_RANGE)} disabled={this.props.isInteractionDisabled}>
                            <Message msgId="gcapp.freeRangePicker.dateRangeButton"/>
                        </Button>
                    )}
                </ButtonGroup>
                {this.props.alertMessage && (
                    <div className="alert-date" >
                        <strong><Message msgId="warning"/></strong>
                        <span ><Message msgId={this.props.alertMessage}
                            msgParams={{minDate: moment(this.props.firstAvailableDate).format(this.props.timeUnit),
                                maxDate: moment(this.props.lastAvailableDate).format(this.props.timeUnit)
                            }}/>
                        </span>
                    </div>
                )}
            </div>
        );
    }
    handleApplyPeriod = () => {
        const { fromData, toData } = this.props;
        if (!fromData || !toData || isNaN(fromData) || isNaN(toData) || !(toData instanceof Date) || !(fromData instanceof Date)) {
            // restore defult values
            this.props.onChangeFromData(this.props.fromDataLayer);
            this.props.onChangeToData(this.props.toDataLayer);
            return;
        }
        // Verifiche sulle date
        const validation = DateAPI.validateDateRange(fromData, toData, this.props.firstAvailableDate, this.props.lastAvailableDate, this.props.timeUnit);
        if (!validation.isValid) {
            this.props.onOpenAlert( "gcapp.errorMessages." + validation.errorMessage);
            return;
        }
        if (this.props.alertMessage !== null) {
            this.props.onCloseAlert();
        }
        this.updateParams({
            fromData: fromData,
            toData: toData
        });
    }
    updateParams(datesParam, onUpdateNode = true) {
        this.props.layers.map((layer) => {
            if (onUpdateNode && isVariabiliMeteoLayer(layer.name, this.props.variabiliMeteo)) {
                const mapFile = DateAPI.getMapfilenameFromSuffix(layer.params?.map,
                    DateAPI.getMapSuffixFromDates(datesParam.fromData, datesParam.toData, this.props.periodTypes));
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
        });
    }
}

const mapStateToProps = createStructuredSelector({
    isCollapsedPlugin: isCollapsedPluginSelector,
    fromData: fromDataFormSelector,
    fromDataLayer: fromDataLayerSelector,
    settings: (state) => state?.layers?.settings || { expanded: false, options: { opacity: 1 } },
    layers: layersSelector,
    showFreeRangePicker: (state) => !state?.fixedrangepicker?.showFixedRangePicker,
    alertMessage: (state) => state?.freerangepicker?.alertMessage || null,
    isInteractionDisabled: (state) => isLayerLoadingSelector(state) || exportImageApiSelector(state),
    isLayerLoading: isLayerLoadingSelector,
    shiftDown: (state) => !!state?.controls?.search?.enabled,
    shiftRight: (state) => !!state?.controls?.drawer?.enabled,
    showChangeRangePickerButton: (state) => state.fixedrangepicker.isPluginLoaded,
    isPluginLoaded: isPluginLoadedSelector,
    firstAvailableDate: firstAvailableDateSelector,
    lastAvailableDate: lastAvailableDateSelector,
    toData: toDataFormSelector,
    toDataLayer: toDataLayerSelector
});

const FreeRangePickerPlugin = connect(mapStateToProps, {
    onMarkPluginAsLoaded: markFreeRangeAsLoaded,
    onMarkPluginAsNotLoaded: markFreeRangeAsNotLoaded,
    onCollapsePlugin: collapsePlugin,
    onChangeFromData: compose(changeFromData, (event) => event),
    onChangeToData: compose(changeToData, (event) => event),
    onUpdateSettings: updateSettings,
    onUpdateNode: updateNode,
    onToggleFreeRangePicker: toggleRangePickerPlugin,
    onOpenAlert: openAlert,
    onCloseAlert: closeAlert,
    onFetchAvailableDates: fetchSelectDate
})(FreeRangePicker);

export default createPlugin(
    'FreeRangePickerPlugin',
    {
        component: assign(FreeRangePickerPlugin, {
            GridContainer: {
                id: 'freeRangePicker',
                name: 'freeRangePicker',
                tool: true,
                position: 1,
                priority: 1
            }
        }),
        reducers: {
            freerangepicker: freerangepicker,
            layers: layers
        },
        epics: rangePickerEpics
    }
);
