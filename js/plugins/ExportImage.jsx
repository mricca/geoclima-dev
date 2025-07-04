/*
 * Copyright 2024, Riccardo Mari - CNR-Ibimet - Consorzio LaMMA.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
*/
import React, { useEffect, useState, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom';
import { connect } from 'react-redux';
import { createStructuredSelector } from 'reselect';
import { Glyphicon } from 'react-bootstrap';
import Message from '@mapstore/components/I18N/Message';
import { toggleControl } from '@mapstore/actions/controls';
import { createPlugin } from '@mapstore/utils/PluginsUtils';
import ResponsivePanel from '@mapstore/components/misc/panels/ResponsivePanel';
import Dialog from '@mapstore/components/misc/Dialog';

import { exportImageEnabledSelector, fileNameSelector, fromDataSelector, toDataSelector,
    isLayerLoadingSelector, tabVariablesSelector, imageUrlSelector, exportImageApiSelector,
    alertMessageSelector, isPluginLoadedSelector } from '../selectors/exportImage';
import * as exportImageEpics from '../epics/exportImage';
import exportimage from '../reducers/exportimage';
import { initializeVariableTabs, setVariabiliMeteo, changeTab, changeImageVariable,
    exportImage, clearImageUrl, setTimeUnit, markAsLoaded } from '../actions/exportimage';

import moment from 'moment';
import momentLocaliser from 'react-widgets/lib/localizers/moment';
import ExportImageForm from '../components/exportimage/ExportImageForm';
momentLocaliser(moment);

const PLUGIN_GLYPH_ICON = "export";

/*
Plugin configuration
"name": "ExportImage",
      "defaultConfig": {
        "defaultUrlExportImage": "geoportale.lamma.rete.toscana.it/geoclima_api/gdownload_image/download-image",
        "timeUnit": "YYYY-MM-DD",
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
        "tabList": [
            {"id": "variableList", "name": "Variabili Meteo", "groupList": [
                                                                  { "id": "Pioggia_Cumulata", "name": "Pioggia Cumulata" },
                                                                  { "id": "Pioggia_Anomalia_mm", "name": "Pioggia Anomalia (mm)" },
                                                                  { "id": "Pioggia_Anomalia_perc", "name": "Pioggia Anomalia (%)" },
                                                                  { "id": "Temperatura_Media", "name": "Temperatura Media" },
                                                                  { "id": "Temperatura_Media_Anomalia", "name": "Temperatura Media Anomalia" },
                                                                  { "id": "Temperatura_Minima", "name": "Temperatura Minima" },
                                                                  { "id": "Temperatura_Minima_Anomalia", "name": "Temperatura Minima Anomalia" },
                                                                  { "id": "Temperatura_Massima", "name": "Temperatura Massima" },
                                                                  { "id": "Temperatura_Massima_Anomalia", "name": "Temperatura Massima Anomalia" }
                                                              ],
                                                              "menuType": "single_select"
              },
              {"id": "spiList", "name": "SPI", "groupList": [
                { "id": "spi1", "name": "SPI-1" },
                { "id": "spi3", "name": "SPI-3" },
                { "id": "spi6", "name": "SPI-6" },
                { "id": "spi12", "name": "SPI-12" }
            ],
            "menuType": "single_select",
            "showOneDatePicker": true
          },
          {"id": "speiList", "name": "SPEI", "groupList": [
            { "id": "spei1", "name": "SPEI-1" },
            { "id": "spei3", "name": "SPEI-3" },
            { "id": "spei6", "name": "SPEI-6" },
            { "id": "spei12", "name": "SPEI-12" }
        ],
        "menuType": "single_select",
        "showOneDatePicker": true
        }]
      },
      "dependencies": [
        "SidebarMenu"
      ]
    }
*/
const ExportImage = ({
    active,
    climateLayers,
    defaultUrlExportImage,
    fileNameExported,
    fromData,
    isInteractionDisabled,
    isPluginLoaded,
    maskLoading,
    onToggleControlExportImage,
    toData,
    onClearImageUrl,
    onChangeImageVariable,
    onChangeTab,
    onExportImage,
    onInitializeVariableTabs,
    onMarkAsLoaded,
    onSetTimeUnit,
    onSetVariabiliMeteo,
    variabiliMeteo,
    tabList,
    tabVariables,
    timeUnit,
    imageUrl,
    alertMessage
}) => {
    // useRef stores the previous values of fromData and toData
    const prevFromData = useRef(fromData);
    const prevToData = useRef(toData);
    // portal-container state is used to manage the portal container for rendering the dialog
    const [portalContainer, setPortalContainer] = useState(null);

    const initializeTabs = useCallback(() => {
        const tabVariablesInit = tabList.map((tab, index) => ({
            id: tab.id,
            variables: [tab.groupList[0]], // Select the first group as default
            active: index === 0, // Set the first tab as active
            showOneDatePicker: tab.showOneDatePicker ?? false
        }));
        onInitializeVariableTabs(tabVariablesInit);
    }, [tabList, onInitializeVariableTabs]);

    useEffect(() => {
        if (tabVariables.length <= 0) {
            initializeTabs();
            onSetTimeUnit(timeUnit);
        }
        if (climateLayers.length <= 0 ) {
            onSetVariabiliMeteo(variabiliMeteo);
        }
        if (!isPluginLoaded) {
            onMarkAsLoaded();
        }
    }, [variabiliMeteo, onSetVariabiliMeteo, initializeTabs]);

    useEffect(() => {
        // Format fromData and toData using timeUnit
        const formattedFromData = moment(fromData).format(timeUnit);
        const formattedToData = moment(toData).format(timeUnit);
        // Format the previous values stored in refs
        const formattedPrevFromData = moment(prevFromData.current).format(timeUnit);
        const formattedPrevToData = moment(prevToData.current).format(timeUnit);
        // Check if the formatted values have changed compared to previous formatted values
        if (formattedPrevFromData !== formattedFromData || formattedPrevToData !== formattedToData) {
            // If imageUrl is set, clear it by calling onClearImageUrl
            if (imageUrl) {
                onClearImageUrl();
            }
        }
        // Update refs with the new formatted values
        prevFromData.current = fromData;
        prevToData.current = toData;
    }, [fromData, toData, imageUrl, onClearImageUrl, timeUnit]);

    // Create the portal container when the component mounts to avoid visibility problems of this plugin
    useEffect(() => {
        const div = document.createElement('div');
        div.id = 'exportimage-portal-root';
        document.body.appendChild(div);
        setPortalContainer(div);
        return () => {
            document.body.removeChild(div);
        };
    }, []);

    const contentExportImage =  (
        <ResponsivePanel
            containerId="export-image-container"
            containerClassName="export-image-container"
            size={440}
            open={active}
            position="right"
            bsStyle="primary"
            glyph={PLUGIN_GLYPH_ICON}
            title={<Message msgId="exportImage.title" />}
            onClose={onToggleControlExportImage}
        >
            <Dialog
                id="exportimage-dialog"
                maskLoading={maskLoading}
                draggable={false}  // Puoi modificare se vuoi rendere il dialog trascinabile
                backgroundStyle={{ background: "rgba(0, 0, 0, 0.5)" }}
                containerClassName="export-image-dialog-container"
                onClickOut={onToggleControlExportImage}
            >
                <ExportImageForm
                    fileNameExported={fileNameExported}
                    fromData={fromData}
                    toData={toData}
                    variabiliMeteo={variabiliMeteo}
                    tabList={tabList}
                    tabVariables={tabVariables}
                    timeUnit={timeUnit}
                    isInteractionDisabled={isInteractionDisabled}
                    handleChangeTab={onChangeTab}
                    handleChangeVariable={onChangeImageVariable}
                    apiUrl={defaultUrlExportImage}
                    imageUrl={imageUrl}
                    exportImage={onExportImage}
                    clearImageUrl={onClearImageUrl}
                    alertMessage={alertMessage}
                    role="body"
                />
            </Dialog>
        </ResponsivePanel>
    );
    // If the container is not ready yet, render nothing
    if (!portalContainer) {
        return null;
    }
    return ReactDOM.createPortal(contentExportImage, portalContainer);
};

const mapStateToProps = createStructuredSelector({
    climateLayers: state => state.exportimage?.climateLayers,
    fileNameExported: fileNameSelector,
    fromData: fromDataSelector,
    maskLoading: exportImageApiSelector,
    toData: toDataSelector,
    active: exportImageEnabledSelector,
    isInteractionDisabled: isLayerLoadingSelector,
    isPluginLoaded: isPluginLoadedSelector,
    tabVariables: tabVariablesSelector,
    imageUrl: imageUrlSelector,
    alertMessage: alertMessageSelector
});

const mapDispatchToProps = {
    onChangeImageVariable: changeImageVariable,
    onChangeTab: changeTab,
    onClearImageUrl: clearImageUrl,
    onExportImage: exportImage,
    onInitializeVariableTabs: initializeVariableTabs,
    onMarkAsLoaded: markAsLoaded,
    onSetTimeUnit: setTimeUnit,
    onSetVariabiliMeteo: setVariabiliMeteo,
    onToggleControlExportImage: () => toggleControl('exportImage', 'enabled')
};

export default createPlugin('ExportImage', {
    component: connect(mapStateToProps, mapDispatchToProps)(ExportImage),
    containers: {
        BurgerMenu: {
            name: 'exportImage',
            position: 1,
            text: <Message msgId="exportImage.title" />,
            icon: <Glyphicon glyph={PLUGIN_GLYPH_ICON} />,
            action: () => toggleControl('exportImage', 'enabled'),
            priority: 2,
            doNotHide: true
        },
        SidebarMenu: {
            name: 'exportImage',
            position: 1,
            icon: <Glyphicon glyph={PLUGIN_GLYPH_ICON} />,
            text: <Message msgId="exportImage.title" />,
            action: () => toggleControl('exportImage', 'enabled'),
            toggle: true,
            priority: 1,
            doNotHide: true
        }
    },
    reducers: { exportimage },
    epics: exportImageEpics
});
