angular.module('PaperUI.services', ['PaperUI.constants']).config(function($httpProvider){
    var language = localStorage.getItem('language');
    if(language) {
        $httpProvider.defaults.headers.common['Accept-Language'] = language;
    }
	$httpProvider.interceptors.push(function($q, $injector) {
		return {
			'responseError': function(rejection) {
				$injector.get('toastService').showErrorToast('ERROR: ' + rejection.status + ' - ' + rejection.statusText);
				return $q.reject(rejection);
			}
		};
	});
}).factory('eventService', function($resource, $log, restConfig) {
	
	var callbacks = [];
	var eventSrc;
	
	var initializeEventService = function() {

	    eventSrc = new EventSource(restConfig.eventPath)
	    $log.debug('Initializing event service.')

	    eventSrc.addEventListener('error', function (event) {
	        if (eventSrc.readyState === 2) { // CLOSED
	            $log.debug('Event connection broken. Trying to reconnect in 5 seconds.');
	            setTimeout(initializeEventService, 5000);
	        }
    	}); 
    	eventSrc.addEventListener('message', function (event) {
            var data = JSON.parse(event.data);
            $log.debug('Event received: ' + data.topic + ' - ' + data.payload);
            $.each(callbacks, function(index, element) {
            	if(data.topic.match(element.topic)) {
            		element.callback(data.topic, JSON.parse(data.payload));
            	}
            });
        });
	}
	initializeEventService();
	
	return new function() {
		this.onEvent = function(topic, callback) {
			var topicRegex = topic.replace('/', '\/').replace('*', '.*');
			callbacks.push({topic: topicRegex, callback: callback});
		}
	};
}).factory('toastService', function($mdToast, $rootScope) {
	return new function() {
	    var self = this;
		this.showToast = function(id, text, actionText, actionUrl) {
	    	var toast = $mdToast.simple().content(text);
	        if(actionText) {
	        	toast.action(actionText);
	        	toast.hideDelay(6000);
	        } else {
	        	toast.hideDelay(3000);
	        }
	        toast.position('bottom right');
	        $mdToast.show(toast).then(function() {
				$rootScope.$location.path(actionUrl);
			});
	    }
	    this.showDefaultToast = function(text, actionText, actionUrl) {
	    	self.showToast('default', text, actionText, actionUrl);
	    }
	    this.showErrorToast = function(text, actionText, actionUrl) {
	    	self.showToast('error', text, actionText, actionUrl);
	    }
	    this.showSuccessToast = function(text, actionText, actionUrl){
	    	self.showToast('success', text, actionText, actionUrl);
	    }
	};
}).factory('configService', function(itemService) {
    return {
        getRenderingModel: function(configParameters) {
            var parameters = [];
            if(!configParameters) {
                return parameters;
            }
            var itemsList;
            for (var i = 0; i < configParameters.length; i++) {
                var parameter = configParameters[i];
              
                if(parameter.context && parameter.context.toUpperCase()==='ITEM'){
                	parameter.element = 'select';
                	itemsList = itemsList === undefined ? itemService.getAll() : itemsList;
                	parameter.options = itemsList;
                }
                else if(parameter.type.toUpperCase() === 'TEXT' ) {
                    if(parameter.options && parameter.options.length > 0) {
                        parameter.element = 'select';
                        parameter.options = parameter.options;
                    } else {
                        parameter.element = 'input';
                        parameter.inputType = parameter.context === 'password' ? 'password' : 'text';
                    }
                } else if(parameter.type.toUpperCase() === 'BOOLEAN') {
                    parameter.element = 'switch';
                } else if(parameter.type.toUpperCase() === 'INTEGER' || parameter.type.toUpperCase() === 'DECIMAL') {
                	 if(parameter.options && parameter.options.length > 0) {
                         parameter.element = 'select';
                         parameter.options = parameter.options;
                     } else	{
                    	 parameter.element = 'input';
                    	 parameter.inputType = 'number';
                     }
                } else {
                    parameter.element = 'input';
                    parameter.inputType = 'text';
                }
                parameters.push(parameter);
            }
            return parameters;
        },
        getConfigAsArray: function(config) {
        	var configArray = [];
        	angular.forEach(config, function(value, name) {
        		var value = config[name];
        		configArray.push({
        			name: name,
        			value: value
        		});
        	});
        	return configArray;
        },
        getConfigAsObject: function(configArray) {
        	var config = {};
        	angular.forEach(configArray, function(configEntry) {
        		config[configEntry.name] = configEntry.value;
        	});
        	return config;
        },
        setDefaults: function(thing, thingType) {
            if(thingType && thingType.configParameters) {
                $.each(thingType.configParameters, function(i, parameter) {
                    if(parameter.defaultValue !== 'null') {
                        if(parameter.type === 'TEXT') {
                            thing.configuration[parameter.name] = parameter.defaultValue
                        } else if(parameter.type === 'BOOLEAN') {
                            thing.configuration[parameter.name] = new Boolean(parameter.defaultValue);
                        } else if(parameter.type === 'INTEGER' || parameter.type === 'DECIMAL') {
                            thing.configuration[parameter.name] = parseInt(parameter.defaultValue);
                        } else {
                            thing.configuration[parameter.name] = parameter.defaultValue;
                        }
                    } else {
                        thing.configuration[parameter.name] = '';
                    }
                });
            }
        }
    };
});