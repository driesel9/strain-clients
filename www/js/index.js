var app = {
  // Application Constructor
  initialize: function() {
    if (navigator.userAgent.match(/(iPhone|iPod|iPad|Android|BlackBerry)/)) {
      document.addEventListener('deviceready', this.onDeviceReady, false);
    } else {
      this.onDeviceReady();
    }
  },

  onDeviceReady: function() {
    var Sentry = cordova.require('sentry-cordova.Sentry');
    Sentry.init({
      dsn: 'https://d1a9edf259aa4027b4623511aa4eecb1@sentry.io/1814452',
    });

    StatusBar.overlaysWebView(true);

    controller.bindEvents();

    app.overrideBrowserAlert();
    app.handleExternalLinks();
    app.locationVerificator();

    // onesignalcode
    window.plugins.OneSignal.startInit(ONE_SIGNAL_KEY)
      .handleNotificationOpened(function(jsonData) {
        console.log(
          'didOpenRemoteNotificationCallBack: ' + JSON.stringify(jsonData)
        );
        if (window.localStorage.getItem('LoggedIn') == 'in') {
          var front = 'open-alerts';
          controller.renderProfileView(front);
        }
      })
      .endInit();

    window.plugins.OneSignal.registerForPushNotifications();
    window.plugins.OneSignal.setSubscription(true);
    screen.orientation.lock('portrait');

    requestBusiness(function(business) {
      var loggedUser = window.localStorage.getItem('LoggedIn') === 'in';
      var isTestUser =
        window.localStorage.getItem('UserEmail') === USER_TEST_EMAIL;

      if (business.allowCart === true && loggedUser && !isTestUser) {
        $('header.header .cart-icon').removeClass('hide');
      }
    });
  },

  overrideBrowserAlert: function() {
    if (navigator.notification) {
      // Override default HTML alert with native dialog
      window.alert = function(message) {
        navigator.notification.alert(
          message, // message
          null, // callback
          'Strain', // title
          'OK' // buttonName
        );
      };
    }
  },

  handleExternalLinks: function() {
    if (device.platform.toUpperCase() === 'ANDROID') {
      $(document).on('click', 'a[href^="http"]', function(e) {
        var url = $(this).attr('href');
        navigator.app.loadUrl(url, { openExternal: true });
        e.preventDefault();
      });
    } else if (device.platform.toUpperCase() === 'IOS') {
      $(document).on('click', 'a[href^="http"]', function(e) {
        var url = $(this).attr('href');
        cordova.InAppBrowser.open(url, '_system', 'location=yes');
        e.preventDefault();
      });
    }
  },

  locationVerificator: function() {
    var verificator = function(enabled) {
      if (enabled) {
        navigator.geolocation.getCurrentPosition(
          onLocationSuccess,
          onLocationError,
          { enableHighAccuracy: true }
        );

        function onLocationSuccess(position) {
          var mylatitude = position.coords.latitude;
          var mylongitude = position.coords.longitude;

          function isLatitude(latitude) {
            if (!IS_PRODUCTION) {
              return true;
            }

            if (latitude > 17.5 && latitude < 18.5) {
              // si mi latitid es mayor a 17.500 y menor a 18.500
              return true;
            } else {
              return false;
            }
          }

          function isLongitude(longitude) {
            if (!IS_PRODUCTION) {
              return true;
            }

            if (longitude < -64.1 && longitude > -67.3) {
              // si mi longitud es mayor a -64.1000 y menor a -67.3000
              return true;
            } else {
              return false;
            }
          }

          if (isLatitude(mylatitude) && isLongitude(mylongitude)) {
            /*if the user locates in puerto rico*/
            if (
              window.localStorage.getItem('ageVerification') == 'false' ||
              window.localStorage.getItem('ageVerification') == ''
            ) {
              window.localStorage.setItem('FirstTime', 1); //--- for first time
              window.localStorage.setItem('renewNotification', 'disable');
              controller.renderIntroView();
            } else if (
              window.localStorage.getItem('ageVerification') == 'true'
            ) {
              var login_time = window.localStorage.getItem('ExpireTime');
              var loggedin = window.localStorage.getItem('LoggedIn');

              if (loggedin == 'in') {
                // for registered users

                controller.renderHomeView();
              } else if (login_time > Date.now() && loggedin == 'guest') {
                // for guest users

                controller.renderHomeView();
                $('body').addClass('guest');
                $('body').removeClass('logged-in');
              } else {
                //
                controller.renderLoginView();
              }
            } else {
              controller.renderIntroView();
            }
          } else {
            controller.renderNotAllowedRegion();
          }
        }

        function onLocationError(error) {
          console.log(
            'code: ' + error.code + '\n' + 'message: ' + error.message + '\n'
          );
          alert(
            "In order to use this application please enable your device's location and try again."
          );
          controller.renderNotAllowedRegion();
        }
      } else {
        console.log('Device with Location Off');
        alert(
          "In order to use this application please enable your device's location and try again."
        );
        controller.renderNotAllowedRegion();
      }
    };

    if (window.cordova.platformId == 'android') {
      cordova.plugins.diagnostic.isGpsLocationEnabled(verificator, function(
        error
      ) {
        console.error('The following error occurred: ' + error);
      });
    } else {
      verificator(true);
    }
  },
};

app.initialize();
