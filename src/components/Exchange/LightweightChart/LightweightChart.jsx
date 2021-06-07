import React from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import Debounce from 'awesome-debounce-promise';
import Driver from '../../../lib/Driver';
import images from '../../../images';
import {
    CrosshairMode,
    PriceScaleMode,
} from '../../../../node_modules/lightweight-charts/dist/lightweight-charts.esm.production';
import * as chartOptions from './LightweightChartOptions';
import * as converterOHLC from './ConverterOHLC';
import exportChartPng from './CanvasHandler';
import UtcTimeString from './UtcTimeString/UtcTimeString';
import ChartDataPanel from './ChartDataPanel/ChartDataPanel';
import FullscreenScrollBlock from './FullscreenScrollBlock/FullscreenScrollBlock';

const AGGREGATIONS_DEPS = {
    // 3 days
    60: 3 * 24 * 60 * 60,
    // 1 week
    300: 7 * 24 * 60 * 60,
    // 1 month
    900: 31 * 24 * 60 * 60,
    // 6 months
    3600: 6 * 31 * 24 * 60 * 60,
    // 3 years
    86400: 3 * 12 * 31 * 24 * 60 * 60,
    // 5 years
    604800: 5 * 12 * 31 * 24 * 60 * 60,
};

export default class LightweightChart extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            pairName: this.props.pairName,
            chartInited: false,
            isLoadingNext: false,
            isLoadingInit: false,
            trades: [],
            volumes: [],
            nextTrades: null,
            fullHistoryLoaded: false,
        };
        this.applyChartOptions = this.applyChartOptions.bind(this);

        this.debouncedUpdateLastTrades = Debounce(this.updateLastTrades.bind(this), 700);

        this.unsubLastTrades = this.props.d.orderbook.event.sub(event => {
            if (event && event.lastTrades) {
                this.debouncedUpdateLastTrades();
            }
        });
    }

    componentDidMount() {
        this._mounted = true;
        this.getTrades(this.props.timeFrame);
        this.chartInit();
        window.addEventListener('resize', Debounce(this.applyChartOptions, 150));
    }

    shouldComponentUpdate() {
        return this.CHART !== undefined;
    }

    componentDidUpdate(prevProps, prevState) {
        const chartSeriesIsChanged =
            prevProps.lineChart !== this.props.lineChart ||
            prevProps.candlestickChart !== this.props.candlestickChart ||
            prevProps.barChart !== this.props.barChart;

        this.applyChartOptions();

        if (prevProps.timeFrame !== this.props.timeFrame || prevState.isLoadingInit) {
            this.CHART.timeScale().fitContent();
        }

        if (chartSeriesIsChanged) {
            this.setChartSeries();
        }
        this.setChartData();

        if (chartSeriesIsChanged && this.oldSeries !== undefined) {
            this.CHART.removeSeries(this.oldSeries);
        }
    }

    componentWillUnmount() {
        this._mounted = false;
        this.CHART.unsubscribeVisibleTimeRangeChange();
        window.removeEventListener('resize', this.applyChartOptions);
        this.unsubLastTrades();
    }

    onClickTimeFrameBtn(timeFrame) {
        if (timeFrame === this.props.timeFrame) {
            return;
        }
        this.props.onUpdate('timeFrame', timeFrame);

        this.getTrades(timeFrame);
    }

    getTrades(timeFrame) {
        this.setState({
            isLoadingInit: true,
            trades: [],
            volumes: [],
            nextTrades: null,
            fullHistoryLoaded: false,
        });

        const { data, handlers } = this.props.d.orderbook;

        const endDate = Math.round(Date.now() / 1000);
        const startDate = endDate - AGGREGATIONS_DEPS[timeFrame];

        handlers.getTrades(startDate, endDate, timeFrame, 100).then(res => {
            if (!res) {
                this.setState({
                    isLoadingInit: false,
                    trades: [],
                    volumes: [],
                    nextTrades: null,
                    fullHistoryLoaded: true,
                });
                return;
            }

            const fullLoaded = res.records.length === 0;
            const convertedTrades = converterOHLC.aggregationToOhlc([...res.records], timeFrame);
            const convertedVolume = converterOHLC.getVolumeData(convertedTrades, data);
            if (this._mounted) {
                this.setState({
                    isLoadingInit: false,
                    trades: convertedTrades,
                    volumes: convertedVolume,
                    nextTrades: res.next,
                    fullHistoryLoaded: fullLoaded,
                });
            }
        });
    }

    getNextTrades() {
        const { timeFrame, d } = this.props;
        const { fullHistoryLoaded } = this.state;

        if (fullHistoryLoaded) { return; }

        this.setState({ isLoadingNext: true });
        this.state.nextTrades().then(res => {
            const fullLoaded = res.records.length === 0;
            const convertedTrades = converterOHLC.aggregationToOhlc([...res.records], timeFrame);
            const convertedVolume = converterOHLC.getVolumeData(convertedTrades, d.orderbook.data);
            const concatedTrades = [...convertedTrades, ...this.state.trades];
            const concatedVolumes = [...convertedVolume, ...this.state.volumes];

            if (this._mounted) {
                this.setState({
                    isLoadingNext: false,
                    trades: concatedTrades,
                    volumes: concatedVolumes,
                    nextTrades: res.next,
                    fullHistoryLoaded: fullLoaded,
                });
            }
        });
    }

    setChartData() {
        this.ohlcSeries.setData(this.state.trades);
        this.volumeSeries.setData(this.state.volumes);
    }

    getTimeFrameBtn(btnText, timeFrame) {
        return (
            <a
                className={`timeBtn ${this.props.timeFrame === timeFrame ? 'timeBtn_active' : ''}`}
                onClick={() => this.onClickTimeFrameBtn(timeFrame)}
            >
                {btnText}
            </a>
        );
    }

    getChangeScaleBtn(text, scaleMode) {
        return (
            <a
                className={`scaleBtn ${this.props.scaleMode === scaleMode ? 'scaleBtn_active' : ''}`}
                onClick={() => this.props.onUpdate('scaleMode', scaleMode)}
            >
                {text}
            </a>
        );
    }

    setChartSeries() {
        const { lineChart, barChart, candlestickChart } = this.props;

        if (this.ohlcSeries !== undefined) {
            this.oldSeries = this.ohlcSeries;
        }

        if (barChart) {
            this.ohlcSeries = this.CHART.addBarSeries(chartOptions.getBarOptions());
        } else if (candlestickChart) {
            this.ohlcSeries = this.CHART.addCandlestickSeries(chartOptions.getCandlestickOptions());
        } else if (lineChart) {
            this.ohlcSeries = this.CHART.addAreaSeries(chartOptions.getAreaOptions());
        }
    }

    setChartSettings() {
        const chartCursorMode = this.props.lineChart ? CrosshairMode.Magnet : CrosshairMode.Normal;

        this.CHART = chartOptions.createLightChart(window.lightChart, chartCursorMode);
        this.volumeSeries = this.CHART.addHistogramSeries(chartOptions.getVolumeOptions());
        this.setChartSeries();

        this.CHART.subscribeVisibleTimeRangeChange(param => {
            if (!param || !param.from) { return; }

            const lastTradeElement = this.state.trades[0];
            const tradesIsLoaded = this.state.trades.length !== 0;

            if (tradesIsLoaded && param.from === lastTradeElement.time && !this.state.isLoadingNext) {
                this.getNextTrades();
            }
            // Sets first visible trade, only for screenshot
            this.firstVisibleTrade = this.state.trades.find(trade => trade.time === param.to);
            this.firstVisibleVolume = this.state.volumes.find(trade => trade.time === param.to);
        });

        this.setState({ chartInited: true });
    }

    getScreenshot() {
        const { pairName } = this.state;
        const timeFrameInMin = this.props.timeFrame / 60;
        const canvasScreenshot = this.CHART.takeScreenshot();
        const timeString = moment(new Date()).format('MM_DD_YYYY');
        const imageName = `StellarTerm-${pairName}_${timeString}`;
        exportChartPng(
            canvasScreenshot,
            imageName,
            pairName,
            timeFrameInMin,
            this.firstVisibleTrade,
            this.firstVisibleVolume,
        );
    }

    updateLastTrades() {
        const { timeFrame } = this.props;

        if (!this.state.trades.length || this.state.isLoadingInit) {
            return;
        }

        const endDate = Math.round(Date.now() / 1000);
        const startDate = endDate - AGGREGATIONS_DEPS[timeFrame];

        this.props.d.orderbook.handlers.getTrades(startDate, endDate, timeFrame, 2).then(res => {
            const { trades, volumes, nextTrades, fullHistoryLoaded } = this.state;

            const convertedLastTrades = converterOHLC.aggregationToOhlc([...res.records], timeFrame);
            const convertedLastVolume = converterOHLC.getVolumeData(convertedLastTrades, this.props.d.orderbook.data);

            const [secondLastTrade, lastTrade] = convertedLastTrades;
            const [secondLastVolume, lastVolume] = convertedLastVolume;

            const secondLastTradeIndex = trades.findIndex(trade => trade.time === secondLastTrade.time);
            const lastTradeIndex = trades.findIndex(trade => trade.time === lastTrade.time);

            trades[secondLastTradeIndex] = secondLastTrade;
            volumes[secondLastTradeIndex] = secondLastVolume;

            if (lastTradeIndex !== -1) {
                trades[lastTradeIndex] = lastTrade;
                volumes[lastTradeIndex] = lastVolume;
            } else {
                trades.push(lastTrade);
                volumes.push(lastVolume);
            }

            if (this._mounted) {
                this.setState({
                    trades,
                    volumes,
                    nextTrades,
                    fullHistoryLoaded,
                });
            }
        });
    }

    chartInit() {
        window.lightChart = document.getElementById('LightChart');

        if (!this.state.chartInited) {
            this.setChartSettings();
        }
    }

    applyChartOptions() {
        const chart = document.getElementById('LightChart');
        const chartCursorMode = this.props.lineChart ? CrosshairMode.Magnet : CrosshairMode.Normal;

        this.CHART.applyOptions({
            width: chart.clientWidth,
            height: chart.clientHeight,
            priceScale: { mode: this.props.scaleMode },
            crosshair: { mode: chartCursorMode },
        });
    }

    render() {
        const { chartInited, isLoadingInit, pairName } = this.state;
        const { trades, volumes } = this.state;
        const { fullscreen } = this.props;
        const noDataFounded = trades.length === 0;
        const showChartControls = chartInited && !isLoadingInit;

        return (
            <React.Fragment>
                {showChartControls ? (
                    <ChartDataPanel
                        chart={this.CHART}
                        timeFrame={this.props.timeFrame}
                        trades={trades}
                        volumes={volumes}
                        pairName={pairName}
                    />
                ) : null}

                <div className="chart_Msg_Container">
                    <div id="LightChart" style={isLoadingInit || noDataFounded ? { display: 'none' } : {}} />
                    {noDataFounded && !isLoadingInit ? (
                        <p className="chart_message">No trade history found!</p>
                    ) : null}
                    {isLoadingInit ? (
                        <div className="nk-spinner" />
                    ) : null}
                </div>

                {showChartControls ? (
                    <div className="chart_Settings_Panel">
                        <div className="panel_container">
                            <div className="timeFrame_btns">
                                {this.getTimeFrameBtn('1m', converterOHLC.FRAME_MINUTE)}
                                {this.getTimeFrameBtn('5m', converterOHLC.FRAME_5MINUTES)}
                                {this.getTimeFrameBtn('15m', converterOHLC.FRAME_FOURTH_HOUR)}
                                {this.getTimeFrameBtn('1h', converterOHLC.FRAME_HOUR)}
                                {this.getTimeFrameBtn('1d', converterOHLC.FRAME_DAY)}
                                {this.getTimeFrameBtn('1w', converterOHLC.FRAME_WEEK)}
                            </div>
                            {fullscreen ? <FullscreenScrollBlock /> : null}
                            <div className="scale_Settings">
                                <UtcTimeString />
                                <div className="priceScale_Btns">
                                    {this.getChangeScaleBtn('%', PriceScaleMode.Percentage)}
                                    {this.getChangeScaleBtn('Log', PriceScaleMode.Logarithmic)}
                                    {this.getChangeScaleBtn('Normal', PriceScaleMode.Normal)}
                                </div>
                            </div>
                        </div>
                        <a className="scrollTime_btn" onClick={() => this.CHART.timeScale().scrollToRealTime()}>
                            <img src={images['icon-rightArrow']} alt="arrow" />
                        </a>
                    </div>
                ) : null}
            </React.Fragment>
        );
    }
}

LightweightChart.propTypes = {
    d: PropTypes.instanceOf(Driver).isRequired,
    onUpdate: PropTypes.func.isRequired,
    timeFrame: PropTypes.number.isRequired,
    pairName: PropTypes.string.isRequired,
    scaleMode: PropTypes.number,
    candlestickChart: PropTypes.bool,
    barChart: PropTypes.bool,
    lineChart: PropTypes.bool,
    fullscreen: PropTypes.bool,
};
