/*!
 * Name    : Just Another Parallax [Jarallax]
 * Version : 1.5.0
 * Author  : _nK http://nkdev.info
 * GitHub  : https://github.com/nk-o/jarallax
 */
(function(factory) {
    'use strict';
    if (typeof define === 'function' && define.amd) {
        define(['jquery'], factory);
    } else if (typeof exports !== 'undefined') {
        module.exports = factory(require('jquery'));
    } else {
        factory(jQuery);
    }
}(function($) {
    // Adapted from https://gist.github.com/paulirish/1579671
    if (!Date.now)
        Date.now = function() { return new Date().getTime(); };
    if(!window.requestAnimationFrame)
        (function() {
            'use strict';
            
            var vendors = ['webkit', 'moz'];
            for (var i = 0; i < vendors.length && !window.requestAnimationFrame; ++i) {
                var vp = vendors[i];
                window.requestAnimationFrame = window[vp+'RequestAnimationFrame'];
                window.cancelAnimationFrame = (window[vp+'CancelAnimationFrame']
                                           || window[vp+'CancelRequestAnimationFrame']);
            }
            if (/iP(ad|hone|od).*OS 6/.test(window.navigator.userAgent) // iOS6 is buggy
                || !window.requestAnimationFrame || !window.cancelAnimationFrame) {
                var lastTime = 0;
                window.requestAnimationFrame = function(callback) {
                    var now = Date.now();
                    var nextTime = Math.max(lastTime + 16, now);
                    return setTimeout(function() { callback(lastTime = nextTime); },
                                      nextTime - now);
                };
                window.cancelAnimationFrame = clearTimeout;
            }
        }());

    var supportTransform = (function() {
        var prefixes = 'transform WebkitTransform MozTransform OTransform msTransform'.split(' ');
        var div = document.createElement('div');
        for(var i = 0; i < prefixes.length; i++) {
            if(div && div.style[prefixes[i]] !== undefined) {
                return prefixes[i];
            }
        }
        return false;
    }());

    var support3dtransform = (function() {
        if (!window.getComputedStyle) {
            return false;
        }

        var el = document.createElement('p'), 
            has3d,
            transforms = {
                'webkitTransform':'-webkit-transform',
                'OTransform':'-o-transform',
                'msTransform':'-ms-transform',
                'MozTransform':'-moz-transform',
                'transform':'transform'
            };

        // Add it to the body to get the computed style.
        (document.body || document.documentElement).insertBefore(el, null);

        for (var t in transforms) {
            if (el.style[t] !== undefined) {
                el.style[t] = "translate3d(1px,1px,1px)";
                has3d = window.getComputedStyle(el).getPropertyValue(transforms[t]);
            }
        }

        (document.body || document.documentElement).removeChild(el);

        return (has3d !== undefined && has3d.length > 0 && has3d !== "none");
    }());
    
    var isAndroid = navigator.userAgent.toLowerCase().indexOf('android') > -1;
    var isOperaOld = !!window.opera;

    // list with all jarallax instances
    // need to render all in one scroll/resize event
    var jarallaxList = [];

    // Jarallax instance
    var Jarallax = (function() {
        var instanceID = 0;

        function Jarallax(item, userOptions) {
            var _this = this,
                dataOptions;

            _this.$item      = $(item);

            _this.defaults   = {
                type              : 'scroll', // type of parallax: scroll, scale, opacity, scale-opacity, scroll-opacity
                speed             : 0.5, // supported value from -1 to 2
                imgSrc            : null,
                imgWidth          : null,
                imgHeight         : null,
                enableTransform   : true,
                zIndex            : -100,

                // events
                onScroll          : null, // function(calculations) {}
                onInit            : null, // function() {}
                onDestroy         : null, // function() {}
                onCoverImage      : null  // function() {}
            };
            dataOptions      = _this.$item.data('jarallax') || {};
            _this.options    = $.extend({}, _this.defaults, dataOptions, userOptions);

            // fix speed option [-1.0, 2.0]
            _this.options.speed = Math.min(2, Math.max(-1, parseFloat(_this.options.speed)));

            _this.instanceID = instanceID++;

            _this.image      = {
                src        : _this.options.imgSrc || null,
                $container : null,
                $item      : null,
                width      : _this.options.imgWidth || null,
                height     : _this.options.imgHeight || null,
                // fix for Android devices
                // use <images> instead background image - more smoothly
                useImgTag  : isAndroid || isOperaOld
            }

            if(_this.initImg()) {
                _this.init();
            }
        }

        return Jarallax;
    }());

    Jarallax.prototype.initImg = function() {
        var _this = this;

        // get image src
        if(_this.image.src === null) {
            _this.image.src = _this.$item.css('background-image').replace(/^url\(['"]?/g,'').replace(/['"]?\)$/g,'');
        }
        if(!_this.image.src || _this.image.src === 'none') {
            return false;
        }
        return true;
    }

    Jarallax.prototype.init = function() {
        var _this = this,
            containerStyles = {
                position         : 'absolute',
                top              : 0,
                left             : 0,
                width            : '100%',
                height           : '100%',
                overflow         : 'hidden',
                'pointer-events' : 'none',
                'transition'     : 'transform linear -1ms, -webkit-transform linear -1ms'
            },
            imageStyles = {
                position              : 'fixed'
            };

        // container for parallax image
        _this.image.$container = $('<div>')
            .css(containerStyles)
            .css({
                visibility : 'hidden',
                'z-index'  : _this.options.zIndex
            })
            .attr('id', 'jarallax-container-' + _this.instanceID)
            .prependTo(_this.$item);

        // use images tag
        if(_this.image.useImgTag && supportTransform) {
            _this.image.$item = $('<images>').attr('src', _this.image.src);
            imageStyles = $.extend({
                'max-width' : 'none'
            }, containerStyles, imageStyles)
        }

        // use div with background image
        else {
            _this.image.$item = $('<div>');
            imageStyles = $.extend({
                'background-position' : '50% 50%',
                'background-size'     : '100% 100%',
                'background-repeat'   : 'no-repeat no-repeat',
                'background-image'    : 'url("' + _this.image.src + '")'
            }, containerStyles, imageStyles)
        }

        // check if one of parents have transform style (without this check, scroll transform will be inverted)
        _this.parentWithTransform = 0;
        _this.$item.parents().each(function() {
            if(!$(this).css('transform') || $(this).css('transform') !== 'none') {
                _this.parentWithTransform = 1;
            }
        })

        // parallax image
        _this.image.$item.css(imageStyles)
            .prependTo(_this.image.$container);

        // cover image if width and height is ready
        function initAfterReady() {
            _this.coverImage();
            _this.clipContainer();
            _this.onScroll(true);

            // save default user styles
            _this.$item.data('jarallax-original-styles', _this.$item.attr('style'));

            // call onInit event
            if(_this.options.onInit) {
                _this.options.onInit.call(_this);
            }

            // timeout to fix IE blinking
            setTimeout(function() {
                // remove default user background
                _this.$item.css({
                    'background-image'      : 'none',
                    'background-attachment' : 'scroll',
                    'background-size'       : 'auto'
                });
            }, 0);
        }

        if(_this.image.width && _this.image.height) {
            // init if width and height already exists
            initAfterReady();
        } else {
            // load image and get width and height
            _this.getImageSize(_this.image.src, function(width, height) {
                _this.image.width  = width;
                _this.image.height = height;
                initAfterReady();
            });
        }
        
        jarallaxList.push(_this);
    };

    Jarallax.prototype.destroy = function() {
        var _this = this;

        // remove from instances list
        for(var k = 0, len = jarallaxList.length; k < len; k++) {
            if(jarallaxList[k].instanceID === _this.instanceID) {
                jarallaxList.splice(k, 1);
                break;
            }
        }

        // remove additional styles for clip
        $('head #jarallax-clip-' + _this.instanceID).remove();

        _this.$item.attr('style', _this.$item.data('jarallax-original-styles'));
        _this.$item.removeData('jarallax-original-styles');

        _this.image.$container.remove();

        // call onDestroy event
        if(_this.options.onDestroy) {
            _this.options.onDestroy.call(_this);
        }

        delete _this.$item[0].jarallax;
    }

    // round to 2 decimals
    Jarallax.prototype.round = function(num) {
        return Math.floor(num * 100) / 100;
    }

    Jarallax.prototype.getImageSize = function(src, callback) {
        if(!src || !callback) {
            return false;
        }

        var tempImg = new Image();
        tempImg.onload = function() {
            callback(tempImg.width, tempImg.height)
        }
        tempImg.src = src;
    }

    // it will remove some image overlapping
    // overlapping occur due to an image position fixed inside absolute possition element (webkit based browsers works without any fix)
    Jarallax.prototype.clipContainer = function() {
        var _this  = this,
            width  = _this.image.$container.outerWidth(true),
            height = _this.image.$container.outerHeight(true);

        var $styles = $('head #jarallax-clip-' + _this.instanceID);
        if(!$styles.length) {
            $('head').append('<style type="text/css" id="jarallax-clip-' + _this.instanceID + '"></style>');
            $styles = $('head #jarallax-clip-' + _this.instanceID);
        }

        var css = [
            '#jarallax-container-' + _this.instanceID + ' {',
            '   clip: rect(0px ' + width + 'px ' + height + 'px 0);',
            '   clip: rect(0px, ' + width + 'px, ' + height + 'px, 0);',
            '}'
        ].join('\n');

        // add clip styles inline (this method need for support IE8 and less browsers)
        if ($styles[0].styleSheet) {
            $styles[0].styleSheet.cssText = css;
        } else {
            $styles.html(css);
        }
    }

    Jarallax.prototype.coverImage = function() {
        var _this = this;

        if(!_this.image.width || !_this.image.height) {
            return;
        }

        var contW = Math.max(_this.image.$container.outerWidth(true), $(window).outerWidth(true)),
            contH = Math.max(_this.image.$container.outerHeight(true), $(window).outerHeight(true)),
            imgW  = _this.image.width,
            imgH  = _this.image.height,
            resultWidth, resultHeight;

        var speedFactor = 1;
        if(_this.options.speed < 0) {
            speedFactor += Math.abs(_this.options.speed);
        }
        else if(_this.options.speed > 1) {
            speedFactor = _this.options.speed;
        }

        var css = {
            width  : contW * speedFactor,
            height : contH * speedFactor,
            marginLeft: 0,
            marginTop: 0
        };

        // cover by width
        if(css.width / css.height > imgW / imgH) {
            resultWidth = css.width;
            resultHeight = css.width * imgH / imgW;
        }

        // cover by height
        else {
            resultWidth = css.height * imgW / imgH;
            resultHeight = css.height;
        }

        css.width = _this.round(resultWidth);
        css.height = _this.round(resultHeight);

        if(css.width > contW) {
            css.marginLeft = _this.round(- (resultWidth - contW) / 2);
        }
        if(css.height > contH) {
            css.marginTop = _this.round(- (resultHeight - contH) / 2);
        }

        // apply to item
        _this.image.$item.css(css);

        // call onCoverImage event
        if(_this.options.onCoverImage) {
            _this.options.onCoverImage.call(_this);
        }
    };

    Jarallax.prototype.isVisible = function() {
        return this.isElementInViewport || false;
    }

    Jarallax.prototype.onScroll = function(force) {
        var _this = this;

        if(!_this.image.width || !_this.image.height) {
            return;
        }

        var section = _this.$item[0].getBoundingClientRect();
        var windowHeight  = $(window).height(),
            windowWidth   = $(window).width(),
            css           = {
                visibility         : 'visible',
                backgroundPosition : '50% 50%'
            };

        _this.isElementInViewport = (
            section.bottom >= 0 &&
            section.right >= 0 &&
            section.top <= windowHeight &&
            section.left <= windowWidth
        );

        // Check if totally above or totally below viewport
        var check = force ? false : !_this.isElementInViewport;
        if (check) {
            return;
        }

        // calculate parallax helping variables
        var beforeTop = Math.max(0, section.top);
        var beforeTopEnd = Math.max(0, section.height + section.top);
        var afterTop = Math.max(0, -section.top);
        var beforeBottom = Math.max(0, section.top + section.height - windowHeight);
        var beforeBottomEnd = Math.max(0, section.height - (section.top + section.height - windowHeight));
        var afterBottom = Math.max(0, -section.top + windowHeight - section.height);

        // calculate on how percent of section is visible
        var visiblePercent = 1;
        if(section.height < windowHeight) {
            visiblePercent = 1 - (afterTop || beforeBottom) / section.height;
        } else {
            if(beforeTopEnd <= windowHeight) {
                visiblePercent = beforeTopEnd / windowHeight;
            } else if (beforeBottomEnd <= windowHeight) {
                visiblePercent = beforeBottomEnd / windowHeight;
            }
        }

        // opacity
        if(_this.options.type == 'opacity' || _this.options.type == 'scale-opacity' || _this.options.type == 'scroll-opacity') {
            css.position = 'absolute';
            css.transform = 'translate3d(0, 0, 0)';
            css.opacity = visiblePercent;
        }

        // scale
        if(_this.options.type == 'scale' || _this.options.type == 'scale-opacity') {
            var scale = 1;
            scale += _this.options.speed * (1 - visiblePercent);
            css.position = 'absolute';
            css.transform = 'scale(' + scale + ') translate3d(0, 0, 0)';
        }

        // scroll
        if(_this.options.type == 'scroll' || _this.options.type == 'scroll-opacity') {
            var positionY = section.top;

            // centering parallax if block < window height
            if(section.height < windowHeight) {
                positionY -= (windowHeight - section.height) / 2;
            }

            // speed from 0 to 1
            if(_this.options.speed >= 0 && _this.options.speed <= 1) {
                positionY *= _this.options.speed;
            }

            // negative speed and from 1 to 2
            else {
                var imageRect = _this.image.$item[0].getBoundingClientRect();
                var percent = (windowHeight + section.height - section.height - section.top) / (windowHeight + section.height);
                    percent = percent - 0.5; // 0.5 for top and 0.5 for bottom
                var newPos = percent * (imageRect.height - Math.max(section.height, windowHeight));

                if(_this.options.speed > 1) {
                    positionY -= newPos;
                } else {
                    positionY = newPos;
                }
            }

            positionY = _this.round(positionY);

            if(supportTransform && _this.options.enableTransform) {
                // fix if parents with transform style
                if(_this.parentWithTransform) {
                    positionY *= -1;
                }

                css.transform = 'translateY(' + positionY + 'px)';
                if(support3dtransform) {
                    css.transform = 'translate3d(0, ' + positionY + 'px, 0)';
                }
            } else {
                css.backgroundPosition = '50% ' + positionY + 'px';
            }
            css.position = 'fixed';
        }

        _this.image.$item.css(css);

        // call onScroll event
        if(_this.options.onScroll) {
            _this.options.onScroll.call(_this, {
                section: section,

                beforeTop: beforeTop,
                beforeTopEnd: beforeTopEnd,
                afterTop: afterTop,
                beforeBottom: beforeBottom,
                beforeBottomEnd: beforeBottomEnd,
                afterBottom: afterBottom,

                visiblePercent: visiblePercent
            });
        }
    };

    // init events
    (function() {
        $(window).on('scroll.jarallax', function() {
            window.requestAnimationFrame(function() {
                for(var k = 0, len = jarallaxList.length; k < len; k++) {
                    jarallaxList[k].onScroll();
                }
            });
        });

        var timeout;
        $(window).on('resize.jarallax orientationchange.jarallax load.jarallax', function() {
            clearTimeout(timeout);
            timeout = setTimeout(function() {
                window.requestAnimationFrame(function() {
                    for(var k = 0, len = jarallaxList.length; k < len; k++) {
                        var _this = jarallaxList[k];
                        _this.coverImage();
                        _this.clipContainer();
                        _this.onScroll();
                    }
                });
            }, 100);
        });
    }());

    var oldJarallax = $.fn.jarallax;

    $.fn.jarallax = function() {
        var items = this,
            options = arguments[0],
            args = Array.prototype.slice.call(arguments, 1),
            len = items.length,
            k = 0,
            ret;

        for (k; k < len; k++) {
            if (typeof options === 'object' || typeof options === 'undefined') {
                if(!items[k].jarallax) {
                    items[k].jarallax = new Jarallax(items[k], options);
                }
            }
            else {
                ret = items[k].jarallax ? items[k].jarallax[options].apply(items[k].jarallax, args) : undefined;
            }
            if (typeof ret !== 'undefined') {
                return ret;
            }
        }

        return this;
    };
    $.fn.jarallax.constructor = Jarallax;

    // no conflict
    $.fn.jarallax.noConflict = function () {
        $.fn.jarallax = oldJarallax;
        return this;
    };

    // data-jarallax initialization
    $(document).on('ready.data-jarallax', function () {
        $('[data-jarallax]').jarallax();
    });
}));