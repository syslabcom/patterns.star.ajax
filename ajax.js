// a library to make and mock ajax calls
define([
    "jquery",
    'logging'
], function($, logging) {
    var log = logging.getLogger('star-pat-ajax');

    var _ = {
        in_progress_class: "pat-ajax-request-in-progress",
        json_request: function(args) {
            args.contentType = 'application/json; charset=UTF-8';
            args.dataType = 'json';
            _.request(args);
        },
        request: function(args) {
            var $el = args.context,
                url = args.url;

            args.type = args.type || 'GET';

            log.debug('request:', args, $el[0]);

            args.error = _._onError($el, url);
            args.success = _._onSuccess($el, url);

            $el.find('em.validation.message.server-side-notification').remove();

            var veto = { veto: false };
            $el.trigger('pat-ajax-before', veto);
            if (veto.veto) {
                // If somebody vetos, they have to take care of
                // informing the user about it.
                log.debug('ajax submit has been vetoed');
                return;
            };

            $el.addClass(_.in_progress_class);
            _._request(args);
        },
        _request: function(args) {
            // Work around Zope limitations.
            if ([ 'PUT', 'DELETE' ].indexOf(args.type) !== -1) {
                args.headers = { 'X-Zope-Real-Method': args.type };
                args.type = 'POST';
            }

            $.ajax(args);
        },
        _onError: function($el, url) {
            return function(jqxhr, textstatus, e) {
                var status = jqxhr.status,
                    body;

                if (["timeout",
                     "abort",
                     "parsererror"].indexOf(textstatus) >= 0)
                {
                    log.error(e, $el[0]);
                    // XXX: properly inform the user
                    status = 500;
                } else {
                    try {
                        // XXX: only if dataType is json
                        body = JSON.parse(jqxhr.responseText);
                    } catch(e) {
                        log.error(e);
                        // XXX: properly inform the user
                        status = 500;
                    }
                }

                _._response($el, status, body);
            };
        },
        _onSuccess: function($el, cfg) {
            return function(data, __, jqxhr) {
                _._response($el, jqxhr.status, data);
            };
        },
        _response: function($el, status, body) {
            log.debug('response:', status, body, $el[0]);
            var event = {
                type: "pat-ajax-" +
                    ((status<300) ? "success" : "error"),
                body: body,
                status: status
            };
            $el.removeClass(_.in_progress_class);
            $el.trigger(event);
        }
    };

    return _;
});
