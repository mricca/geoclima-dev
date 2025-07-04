/**
 * Copyright 2024, GeoSolutions Sas.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */
import axios from '../../MapStore2/web/client/libs/ajax';
import assign from 'object-assign';
import urlUtil from 'url';

/**
 * API using localConfig.json for AJAX proxy settings
 * The proxy URL and allowed CORS domains are defined in localConfig.json
 */
const Api = {
    exportImage: function(layerName, fromData, toData, defaultUrlExportImage, options) {
        var params = assign({ layerName: layerName, fromData: fromData, toData: toData}, options || {});
        var url = urlUtil.format({
            protocol: window.location.hostname === 'localhost' ? 'https:' : window.location.protocol,
            host: defaultUrlExportImage,
            query: params
        });
        return axios.get(url, { responseType: 'blob' });
    },
    geoclimachart: function(data, defaultUrlGeoclimaChart, options) {
        var params = assign({lat: data.latlng.lat, lng: data.latlng.lng, toData: data.toData, fromData: data.fromData, variable: data.variables}, options || {});
        var url = urlUtil.format({
            protocol: window.location.hostname === 'localhost' ? 'https:' : window.location.protocol,
            host: defaultUrlGeoclimaChart,
            query: params
        });
        return axios.get(url); // TODO the jsonp method returns .promise and .cancel method,the last can be called when user cancel the query
    },
    getAibChart: function(data, defaultUrlAibChart, options) {
        var params = assign({lat: data.latlng.lat, lng: data.latlng.lng, fromData: data.fromData, toData: data.toData, fwi_index_type: data.variables}, options || {});
        var url = urlUtil.format({
            protocol: window.location.hostname === 'localhost' ? 'https:' : window.location.protocol,
            host: defaultUrlAibChart,
            query: params
        });
        return axios.get(url);
    },
    getAvailableDates: function(variable, defaultUrlSelectDate, options) {
        var params = assign({ variable: variable}, options || {});
        var url = urlUtil.format({
            protocol: window.location.hostname === 'localhost' ? 'https:' : window.location.protocol,
            host: defaultUrlSelectDate,
            query: params
        });
        return axios.get(url);
    }
};

export default Api;
