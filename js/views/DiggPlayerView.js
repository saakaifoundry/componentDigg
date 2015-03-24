/**
 Digg Backbone posts view
 @class DiggPlayerView
 @constructor
 @return {object} instantiated DiggPlayerView
 **/
define(['jquery', 'backbone', 'text!templates/DiggArticle.html', 'TweenLite', 'ScrollToPlugin'], function ($, Backbone, DiggArticle, TweenLite, ScrollToPlugin) {


    var DiggPlayerView = Backbone.View.extend({

        /**
         Constructor
         @method initialize
         **/
        initialize: function () {
            var self = this;
            BB.comBroker.setService(BB.SERVICES.DIGG_VIEW, self);
            self.m_cacheExpirationSec = 1;
            self.m_purgedIfNotUsedSec = 1000000;
            self.m_skip = false;
            self.m_intervalScroll = undefined;
            self.m_intervalPosition = undefined;
            self.m_scrollPosition = 0;
            _.templateSettings = {interpolate: /\{\{(.+?)\}\}/g};
            self.m_diggTemplate = _.template(DiggArticle);
            self.bbSyncOverride();
            self.collection.on('add', function () {
                self._loadPosts();
            });
            self._listenDispose();

            document.body.style.cursor = 'none';
        },

        /**
         Listen application / component removed from timeline
         @method _listenDispose
         **/
        _listenDispose: function () {
            var self = this;
            BB.comBroker.listen(BB.EVENTS.ON_DISPOSE, function (e) {
                self.collection.off('add');
                BB.comBroker.setService(BB.SERVICES.DIGG_VIEW, undefined);
                window.clearInterval(self.m_intervalScroll);
                window.clearInterval(self.m_intervalPosition);
                BB.comBroker.stopListen(BB.EVENTS.ON_DISPOSE);
            });
        },

        /**
         get remote data (such as json) and cache it locally in the SignagePlayer so we can work offline
         if no network connection is available
         @method bbSyncOverride
         **/
        bbSyncOverride: function () {
            var self = this;
            Backbone.sync = function (method, model, options, error) {
                try {
                    BB.comBroker.listen(BB.EVENTS.ON_CACHING_DATA, function (e) {
                        log('Data in ' + e);
                        var jModels = JSON.parse(e.edata.data);
                        self.collection.add(jModels);
                    });
                    var url = 'https://secure.digitalsignage.com/Digg';
                    getObjectValue(0, 'getCachingData("' + url + '",' + self.m_cacheExpirationSec + ',' + self.m_purgedIfNotUsedSec + ')', function (models) {
                        log('requsted data');
                    });

                     //$.get(url, function (models) {
                     //     self.collection.add(models);
                     // });

                } catch (e){
                    log('problem parsing data ' + e);
                }
            }
        },

        /**
         Load Digg posts
         @method _loadPosts
         **/
        _loadPosts: function () {
            var self = this;
            var half = Math.round(self.collection.length / 2);
            var i = 0;
            self.collection.forEach(function (model) {
                i++;
                var ele = (i > half) ? Elements.DIGGS_P1 : Elements.DIGGS_P2;
                var url = model.get('link');
                setTimeout(function () {
                    getObjectValue(0, 'getCachingPath("' + url + '",' + self.m_cacheExpirationSec + ',' + self.m_purgedIfNotUsedSec + ')', function (itemSrc) {
                        var imgSrc = JSON.parse(itemSrc);
                        var m = {
                            link: imgSrc,
                            title: model.get('title')
                        };
                        $(ele).append($(self.m_diggTemplate(m)).hide().fadeIn());
                    });
                }, 250 * i);
            });
            self._scroll();
        },

        /**
         Send event to SignagePlayer, such as 'next' to move to next item in collection
         @method i_value
         @param {String} string even name to send
         **/
        _sendEvent: function (i_value) {
            var self = this;
            getObjectValue(0, 'sendCommand("' + i_value + '", null)', function (e) {
                console.log(e);
            });
        },

        /**
         Every interval scroll page, of no changes, we hit bottom
         and scroll back to top
         @method _scroll
         **/
        _scroll: function () {
            var self = this;
            var $win = $(window);
            var times = 1;

            self.m_intervalPosition = setInterval(function () {
                var currentPosition = $win.scrollTop();

                // page @ top
                if (currentPosition == 0) {
                    self.m_skip = false;
                    times = 1;
                    self.m_scrollPosition = 0;
                    return;
                }

                // no changes, page @ bottom
                if (currentPosition == self.m_scrollPosition) {
                    TweenLite.to(window, 2, {scrollTo: {y: 0}, ease: Power2.easeOut});
                    self.m_skip = true;
                    times = 1;
                    self.m_scrollPosition = currentPosition;
                    return;
                }
                self.m_scrollPosition = currentPosition;

            }, 3000);

            self.m_intervalScroll = setInterval(function () {
                if (self.m_skip)
                    return;
                TweenLite.to(window, 2, {scrollTo: {y: times}, ease: Power2.easeOut});
                times = times + BB.SCROLL_SPEED;
            }, 500);
        }

    });

    return DiggPlayerView;
});