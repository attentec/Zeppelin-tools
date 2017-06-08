/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import Visualization from 'zeppelin-vis'
import AdvancedTransformation from 'zeppelin-tabledata/advanced-transformation'
import hsv2rgb from './utils/hsv2rgb'
import translate_sweref99 from './utils/sweref99'

window.gMaps = {};
/**
 * Function that initialises all maps registered in gMaps.
 * Used on callback from script loaded.
 */
window.initMaps = function() {
    for (let p in gMaps) {
        if (gMaps.hasOwnProperty(p)) {
            initMap(p);
        }
    }
};

/**
 * Function that creates a gradient between two degrees in the spectrum using a start degree and a width.
 * The width must be a positive value
 *
 */
window.createRainbowDiv = function (start, width){
    let rainbow = function (value, s, l, max, min, start, end, width) {
        value = Math.floor((((max - min) - (value - min)) * width / (max - min)) + start);
        return 'hsl(' + value + ','+s+'%,'+l+'%)';
    };
    let end = start + width;
    var gradient = $("<div>").css({display:"inline-flex", "flex-direction":"row",height:"20px", width:"50%"});
    for (var i = start; ((i <= end) && (i >= start)) || ((i >= end) && (i <= start));
         i += (end-start) / Math.abs(end-start)){
        gradient.append($("<div>").css({float:"left","background-color":rainbow(i, 100,50, Math.max(start,end), Math.min(start,end), start,end, width),flex:1}));
    }
    return gradient;
};

/**
 * Initialises a map stored in gMaps with the instanceId provided as input parameter.
 *
 */
window.initMap = function(instanceId) {

    let parameters = gMaps[instanceId].parameter;
    let rows = gMaps[instanceId].rows;
    let res = {};
    let globalMin;
    let globalMax;
    let map;

    // Check if a API key is set.
    if(parameters['Google maps API key']==""){
        throw {"name":"CustomDisplayError", "message":"Enter Google maps API-Key"};
    }

    // If the google maps script is not loaded, load it.
    let gma = document.getElementById('google-maps-api');
    if(gma == null || gma == undefined){
        let self = this;
        let script = document.createElement('script');
        script.type = "text/javascript";
        if(script.readyState) {  //IE
            script.onreadystatechange = function() {
                if ( script.readyState === "loaded" || script.readyState === "complete" ) {
                    script.onreadystatechange = null;
                    initMaps();
                }
            };
        } else {  //Others
            script.onload = function() {
                initMaps();
            };
        }
        script.id = "google-maps-api";
        script.src = "https://maps.googleapis.com/maps/api/js?key=" + parameters['Google maps API key'];
        document.getElementsByTagName('head')[0].appendChild(script);
    }

    var markers = [];
    if (gMaps[instanceId].type == "scale") {

        // Check for bad values
        if(parameters['markerColorWidth']<=0){
            throw {"name":"CustomDisplayError", "message":"markerColorWidth must be larger than 0"};
        }
        if(parameters['markerScale']<=0){
            throw {"name":"CustomDisplayError", "message":"markerScale must be larger than 0"};
        }

        // Add the HTML needed.
        gMaps[instanceId].targetEl.html('<span id="'+instanceId+'_minValue">min</span> <div style="display: inline" id="'+instanceId+'_color"></div> <span id="'+instanceId+'_maxValue">max</span><div id="'+instanceId+'_map" style="height: 95%;"></div>');

        try{
            map = new google.maps.Map(document.getElementById(instanceId+'_map'), {
                zoom: 3,
                center: new google.maps.LatLng(55.34,13.36),
                mapTypeId: parameters['Map type']
            });
        } catch (err){
            // If google plugin is not loaded yet, return.
            // Will in that case be loaded by initMaps call
            return;
        }

        // load the color scale
        let c = $("#"+instanceId+"_color");
        c.html(createRainbowDiv(parameters['markerColorOffset'], parameters['markerColorWidth']));
        c.css("width","500px").css("height","20px");

        // Join the different fields together in a list of objects.
        for (let i = 0; i < rows.length; i++) {
            let created = false;
            if (res[rows[i]['key1'] + "-" + rows[i]['key2']] === undefined) {
                created = true;
                res[rows[i]['key1'] + "-" + rows[i]['key2']] = {
                    lat: rows[i]['key1'],
                    lng: rows[i]['key2'],
                    value: parseFloat(rows[i]['aggregated']),
                };
                if (i === 0) {
                    globalMin = parseFloat(rows[i]['aggregated']);
                    globalMax = parseFloat(rows[i]['aggregated']);
                }
            }
        }

        // Find global min and max values for the scale
        for (let p in res) {
            if (res.hasOwnProperty(p)) {
                if (globalMin > res[p]["value"]) {
                    globalMin = res[p]["value"];
                }
                if (globalMax < res[p]["value"]) {
                    globalMax = res[p]["value"];
                }
            }
        }
        try {
            document.getElementById(instanceId + '_minValue').innerText = globalMin.toFixed(2);
            document.getElementById(instanceId + '_maxValue').innerText = globalMax.toFixed(2);
        } catch (err) {
            // No data
            return;
        }

        // Print objects on map.
        for (let property in res) {
            if (res.hasOwnProperty(property)) {
                let coords;
                if (parameters['Coordinate system'] == "SWEREF99TM") {
                    coords = translate_sweref99(res[property]['lat'], res[property]['lng']);
                } else {
                    coords = [res[property]['lat'], res[property]['lng']];
                }

                let h = Math.floor((((globalMax - globalMin) - (res[property]["value"] - globalMin)) * parameters['markerColorWidth'] / (globalMax - globalMin)) + parameters['markerColorOffset']);
                let s = 1;
                let v = 1;
                let latLng = new google.maps.LatLng(coords[0], coords[1]);
                markers.push(new google.maps.Marker({
                    position: latLng,
                    map: map,
                    title: "" + res[property]["value"],
                    icon: {
                        path: google.maps.SymbolPath.CIRCLE,
                        fillColor: hsv2rgb(h, s, v),
                        fillOpacity: parameters['fillOpacity'],
                        scale: parameters['markerScale'],
                        strokeColor: 'white',
                        strokeWeight: .0
                    }
                }));

            }
        }
    } else {
        // Group and Scale

        // Add the HTML needed.
        gMaps[instanceId].targetEl.html('<div id="'+instanceId+'_map" style="height: 95%;"></div>');
        try{
            map = new google.maps.Map(document.getElementById(instanceId+'_map'), {
                zoom: 3,
                center: new google.maps.LatLng(55.34,13.36),
                mapTypeId: parameters['Map type']
            });
        } catch (err){
            // If google plugin is not loaded yet, return.
            // Will in that case be loaded by initMaps call
            return;
        }

        let selector_colors = {};
        let selector_color_counter = 0;
        for (let j = 0; j < rows.length; j++) {
            selector_colors[rows[j]['selector']] = selector_color_counter;
            selector_color_counter = selector_color_counter + 33;
            for (let i = 0; i < rows[j]['value'].length; i++) {
                let created = false;
                if (res[rows[j]['value'][i]['key1'] + "-" + rows[j]['value'][i]['key2'] + "-" + rows[j]['selector'] ] === undefined) {
                    created = true;
                    res[rows[j]['value'][i]['key1'] + "-" + rows[j]['value'][i]['key2'] + "-" + rows[j]['selector']] = {
                        lat: rows[j]['value'][i]['key1'],
                        lng: rows[j]['value'][i]['key2'],
                        value: parseFloat(rows[j]['value'][i]['aggregated']),
                        selector: rows[j]['selector']
                    };
                    if (i === 0) {
                        globalMin = parseFloat(rows[j]['value'][i]['aggregated']);
                        globalMax = parseFloat(rows[j]['value'][i]['aggregated']);
                    }
                }
            }
        }
        for (let p in res) {
            if (res.hasOwnProperty(p)) {
                if (globalMin > res[p]["value"]) {
                    globalMin = res[p]["value"];
                }
                if (globalMax < res[p]["value"]) {
                    globalMax = res[p]["value"];
                }
            }
        }

        for (let property in res) {
            if (res.hasOwnProperty(property)) {
                let coords;
                if (parameters['Coordinate system'] == "SWEREF99TM") {
                    coords = translate_sweref99(res[property]['lat'], res[property]['lng']);
                } else {
                    coords = [res[property]['lat'], res[property]['lng']];
                }

                let h = selector_colors[res[property]["selector"]] + parameters['markerColorOffset'];
                let s = 1;
                let v = 1;
                let latLng = new google.maps.LatLng(coords[0], coords[1]);
                markers.push(new google.maps.Marker({
                    position: latLng,
                    map: map,
                    title: "" + res[property]["selector"] + ": " + res[property]["value"],
                    icon: {
                        path: google.maps.SymbolPath.CIRCLE,
                        fillColor: hsv2rgb(h, s, v),
                        fillOpacity: parameters['fillOpacity'],
                        scale: Math.floor(parameters['markerScale'] - (((globalMax - globalMin) - (res[property]["value"] - globalMin)) * parameters['markerScale'] / (globalMax - globalMin)))+parameters['markerBaseScale'],
                        strokeColor: 'white',
                        strokeWeight: .0
                    }
                }));

            }
        }
    }

    // Change the zooming to match the data points.
    var bounds = new google.maps.LatLngBounds();
    for (var i = 0; i < markers.length; i++) {
        bounds.extend(markers[i].getPosition());
    }

    map.fitBounds(bounds);
};


export default class maps extends Visualization {
    constructor(targetEl, config) {
        super(targetEl, config);
        const ScaleParameter = {
            'Google maps API key': { valueType: 'string', defaultValue: '', description: 'Google maps API-key', },
            'Coordinate system': { valueType: 'string', defaultValue: 'SWEREF99TM', description: 'Coordinate system to use', widget: 'option', optionValues: [ 'SWEREF99TM', 'Decimal degrees' ], },
            'Map type': { valueType: 'string', defaultValue: 'terrain', description: 'Map type', widget: 'option', optionValues: [ 'terrain', 'hybrid', 'roadmap', 'satellite' ], },
            'fillOpacity': { valueType: 'float', defaultValue: .4, description: 'opacity of markers', },
            'markerScale': { valueType: 'int', defaultValue: 10, description: 'scale of markers', },
            'markerColorOffset': { valueType: 'int', defaultValue: 0, description: 'marker colour offset', },
            'markerColorWidth': { valueType: 'int', defaultValue: 120, description: 'marker colour width', },
        };
        const GroupScaleParameter = {
            'Google maps API key': { valueType: 'string', defaultValue: '', description: 'Google maps API-key', },
            'Coordinate system': { valueType: 'string', defaultValue: 'SWEREF99TM', description: 'Coordinate system to use', widget: 'option', optionValues: [ 'SWEREF99TM', 'Decimal degrees' ], },
            'Map type': { valueType: 'string', defaultValue: 'terrain', description: 'Map type', widget: 'option', optionValues: [ 'terrain', 'hybrid', 'roadmap', 'satellite' ], },
            'fillOpacity': { valueType: 'float', defaultValue: .4, description: 'opacity of markers', },
            'markerScale': { valueType: 'int', defaultValue: 10, description: 'scale of markers', },
            'markerColorOffset': { valueType: 'int', defaultValue: 0, description: 'marker colour offset', },
            'markerBaseScale': { valueType: 'int', defaultValue: 5, description: 'marker colour width', },
        };
        const spec = {
            charts: {
                'Scale': {
                    transform: { method: 'array:2-key', },
                    sharedAxis: false,
                    axis: {
                        'N': { dimension: 'single', axisType: 'key', minAxisCount: 1, description: 'serial', },
                        'E': { dimension: 'single', axisType: 'key', minAxisCount: 1, description: 'serial', },
                        'Scale': { dimension: 'single', axisType: 'aggregator', },
                    },
                    parameter: ScaleParameter,
                },
                'Group and scale': {
                    transform: { method: 'array:2-key', },
                    sharedAxis: false,
                    axis: {
                        'N': { dimension: 'single', axisType: 'key', minAxisCount: 1, description: 'serial', },
                        'E': { dimension: 'single', axisType: 'key', minAxisCount: 1, description: 'serial', },
                        'Scale': { dimension: 'single', axisType: 'aggregator', },
                        'Group': { dimension: 'multiple', axisType: 'group', },
                    },
                    parameter: GroupScaleParameter,
                },
            }
        };

        this.transformation = new AdvancedTransformation(config, spec);
        this.rows = [];
        let tmp = this.targetEl[0].parentNode.getAttribute('id').split('_');
        this.instanceId = (tmp[0]+"_"+tmp[1]).split('-').join('_');
        gMaps[this.instanceId] = this;
        try {
            initMap(this.instanceId);
        } catch (err){
            // If google plugin is not loaded yet.
            // Will in that case be loaded by initMaps call
            console.log(err.message);
            if (err.name == "CustomDisplayError"){
                this.showError(err);
            }
        }

    }


    drawGoogleChart(parameter, column, transformer) {

        if ( Object.keys(column.key).length < 2 || column.aggregator.length === 0) {
            this.hideChart();
            return; /** have nothing to display, if aggregator is not specified at all */
        }

        const { rows, keyNames, selectors, } = transformer();
        this.parameter = parameter;
        this.type = "scale";
        this.rows = rows[0]['value'];
        gMaps[this.instanceId] = this;
        initMap(this.instanceId);


    }

    drawGoogleGroupChart(parameter, column, transformer) {
        if ( Object.keys(column.key).length < 2 || column.aggregator.length === 0 || column.group.length === 0) {
            this.hideChart();
            return; /** have nothing to display, if aggregator is not specified at all */
        }

        const { rows, keyNames, selectors, } = transformer();
        this.parameter = parameter;
        this.type = "group";
        this.rows = rows;
        gMaps[this.instanceId] = this;
        initMap(this.instanceId);


    }

    /**
     * @param tableData {Object} includes cols and rows. For example,
     *                           `{columns: Array[2], rows: Array[11], comment: ""}`
     *
     * Each column includes `aggr`, `index`, `name` fields.
     *  For example, `{ aggr: "sum", index: 0, name: "age"}`
     *
     * Each row is an array including values.
     *  For example, `["19", "4"]`
     */
    render(tableData) {
        const conf = this.config;
        const {
            chartChanged, parameterChanged,
            chart, parameter, column, transformer,
        } = tableData;

        if (!chartChanged && !parameterChanged) { return }

        try {
            if (chart === 'Scale') {

                this.drawGoogleChart(parameter, column, transformer)
            } else if (chart === 'Group and scale') {

                this.drawGoogleGroupChart(parameter, column, transformer)
            }
        } catch (error) {
            console.error(error);
            this.showError(error)
        }
    }

    getTransformation() {
        return this.transformation
    }

    getChartElementId() {
        return this.targetEl[0].id
    }

    getChartElement() {
        return document.getElementById(this.getChartElementId())
    }

    clearChart() {
        if (this.chartInstance) { this.chartInstance.destroy() }
    }

    hideChart() {
        this.clearChart();
        this.getChartElement().innerHTML = `
        <div style="margin-top: 60px; text-align: center; font-weight: 100">
            <span style="font-size:30px;">
                Please set axes in
            </span>
            <span style="font-size: 30px; font-style:italic;">
                Settings
            </span>
        </div>`
    }

    showError(error) {
        this.clearChart();
        this.getChartElement().innerHTML = `
        <div style="margin-top: 60px; text-align: center; font-weight: 300">
            <span style="font-size:30px; color: #e4573c;">
                ${error.message} 
            </span>
        </div>`
    }
}
