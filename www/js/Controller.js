// NOTE. only need to modify here BUSINESS_ID to create another app
var IS_PRODUCTION = false;

// NOTE.- needs to be updated for each dispensary
var BUSINESS_ID = 57;
var ONE_SIGNAL_KEY = '0003823b-ae10-473a-b466-93116c3157af';

// var API_BASE_URI = 'https://api.thestrainapp.com/rest';
var API_BASE_URI = 'http://192.168.1.54:5000/rest';

var USER_TEST_EMAIL = 'test@app.com';

var globalLocations;
var posLocations;
var selectedPosLocation;
var businessData;
var cart;

var DAYS = [
  'SUNDAY',
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
];

var TOKEN = localStorage.getItem('token');

$.ajaxSetup({
  beforeSend: function(xhr) {
    if (TOKEN != null) {
      xhr.setRequestHeader('Authorization', TOKEN);
    }
  },
});

function formatPhoneNumber(str) {
  if (str == null) {
    return '';
  }

  //Filter only numbers from the input
  var cleaned = ('' + str).replace(/\D/g, '');

  //Check if the input is of correct
  var match = cleaned.match(/^(1|)?(\d{3})(\d{3})(\d{4})$/);

  if (match) {
    //Remove the matched extension code
    //Change this to format for any country code.
    // var intlCode = match[1] ? '+1 ' : '';
    return [match[2], '-', match[3], '-', match[4]].join('');
  }

  return '';
}

function formatURLMap(lat, lng) {
  if (window.cordova.platformId == 'android') {
    return 'geo:0,0?q=' + lat + ',' + lng;
  } else {
    return 'maps://?q=' + lat + ',' + lng;
  }
}

function formatHour(day, openHours) {
  var result = openHours
    .filter(function(openHour) {
      return openHour.day === day;
    })
    .map(function(openHour) {
      return (
        moment(openHour.open, 'HH:mm').format('hh:mm a') +
        ' - ' +
        moment(openHour.close, 'HH:mm').format('hh:mm a')
      );
    })
    .join(', ');

  return result === '' ? 'Closed' : result;
}

function titleCase(str) {
  return str
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/(^|\s)\S/g, function(t) {
      return t.toUpperCase();
    });
}

function distance(lat1, lon1, lat2, lon2, unit) {
  if (lat1 == lat2 && lon1 == lon2) {
    return 0;
  } else {
    var radlat1 = (Math.PI * lat1) / 180;
    var radlat2 = (Math.PI * lat2) / 180;
    var theta = lon1 - lon2;
    var radtheta = (Math.PI * theta) / 180;
    var dist =
      Math.sin(radlat1) * Math.sin(radlat2) +
      Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
    if (dist > 1) {
      dist = 1;
    }
    dist = Math.acos(dist);
    dist = (dist * 180) / Math.PI;
    dist = dist * 60 * 1.1515;
    if (unit == 'K') {
      dist = dist * 1.609344;
    }
    if (unit == 'N') {
      dist = dist * 0.8684;
    }
    return dist;
  }
}

function isLocationOpen(openHours) {
  var now = moment();
  var day = DAYS[now.weekday()];
  return openHours
    .filter(function(openHour) {
      return openHour.day === day;
    })
    .some(function(openHour) {
      var open = moment(openHour.open, 'HH:mm');
      var close = moment(openHour.close, 'HH:mm');
      return now.isBetween(open, close);
    });
}

function strainRequestSignup(event) {
  event.preventDefault();

  var $target = $(event.currentTarget);
  var $submitButton = $target.find('#submit-signup');

  $submitButton.attr('disabled', 'disabled');

  $.ajax({
    url: API_BASE_URI + '/user/signup',
    method: 'POST',
    data: {
      email: $target.find('#name').val(),
      password: $target.find('#pass').val(),
      patientId: $target.find('#mj-user').val(),
      businessId: BUSINESS_ID,
    },
    complete: function() {
      $submitButton.attr('disabled', null);
    },
    success: function() {
      alert('User created successfully');
      /*-- Redirect to home view if register is successfully ---*/
      strainRequestLogin(event);
    },
    error: function(xhr, textStatus) {
      if (xhr.status === 400) {
        xhr.responseJSON.forEach(function(error) {
          if (error.field === 'patientId') {
            $('#notfound').modal('show');
          } else {
            alert('Error: ' + error.description);
          }
        });
      } else {
        console.log('error ' + xhr.status);
        alert('Error creating user.');
      }
      console.log(xhr, textStatus);
    },
  });
}

function strainRequestForgotPassword(event) {
  event.preventDefault();

  var $target = $(event.currentTarget);

  $.ajax({
    url: API_BASE_URI + '/user/forgot-password',
    method: 'POST',
    data: {
      businessId: BUSINESS_ID,
      email: $target.find('#email').val(),
    },
    success: function() {
      alert('Email sent, review your inbox or span');
      $('#email').val('');
    },
    error: function(xhr, textStatus) {
      if (xhr.status === 400) {
        xhr.responseJSON.forEach(function(error) {
          alert('Error: ' + error.field + ' ' + error.description);
        });
      } else {
        console.log('error ' + xhr.status);
        alert('Error creating user.');
      }
      console.log(xhr, textStatus);
    },
  });
}

function strainRequestLogin(event) {
  event.preventDefault();

  var $target = $(event.currentTarget);
  var $submitButton = $target.find('#submit-signup');

  $submitButton.attr('disabled', 'disabled');

  $.ajax({
    url: API_BASE_URI + '/user/login',
    method: 'POST',
    data: {
      businessId: BUSINESS_ID,
      username: $target.find('#name').val(),
      password: $target.find('#pass').val(),
    },
    success: function(data) {
      window.localStorage.setItem('token', data.token);
      TOKEN = data.token;

      $.ajax({
        url: API_BASE_URI + '/user/me',
        method: 'GET',
        success: function(meData) {
          $('body').addClass('logged-in');
          $('body').removeClass('guest');

          window.localStorage.setItem('UserEmail', meData.email);
          window.localStorage.setItem('UserWP', meData.id);
          window.localStorage.setItem(
            'UserPassword',
            $target.find('#pass').val()
          );
          window.localStorage.setItem('LoggedIn', 'in');
          controller.renderHomeView();

          requestBusiness(function(business) {
            var loggedUser = window.localStorage.getItem('LoggedIn') === 'in';
            var isTestUser =
              window.localStorage.getItem('UserEmail') === USER_TEST_EMAIL;
            if (business.allowCart === true && loggedUser && !isTestUser) {
              $('header.header .cart-icon').removeClass('hide');
            } else {
              $('header.header .cart-icon').addClass('hide');
            }
          });
        },
        complete: function() {
          $submitButton.attr('disabled', null);
        },
        error: function(xhr) {
          console.log('error ' + xhr.status);
          alert('Not able to load profile');
        },
      });
    },
    error: function(xhr, textStatus) {
      console.log('error ' + xhr.status);
      alert('Incorrect username or password.');
    },
  });
}

function strainRequestPOSLocations(success, error, complete) {
  if (posLocations) {
    success(posLocations);
  } else {
    $.ajax({
      url: API_BASE_URI + '/pos/locations',
      method: 'GET',
      data: {
        businessId: BUSINESS_ID,
      },
      success: function(data) {
        posLocations = data;
        globalLocations = {};
        data.locations.forEach(function(location) {
          globalLocations[location.id] = location.name;
        });
        success(data);
      },
      error: error,
      complete: complete,
    });
  }
}

function strainRequestPOSCategories(locationId, success, error, complete) {
  $.ajax({
    url: API_BASE_URI + '/pos/categories',
    method: 'GET',
    data: {
      locationId: locationId,
      businessId: BUSINESS_ID,
    },
    success: success,
    error: error,
    complete: complete,
  });
}

function strainRequestPOSOrders(status, locationId, callback) {
  $.ajax({
    url: API_BASE_URI + '/pos/orders',
    method: 'GET',
    data: {
      locationId: locationId,
      status: status,
    },
    success: function(data) {
      if (data && data.orders && data.orders.length > 0) {
        callback(data.orders, locationId);
      }
    },
    error: function() {
      alert('Unable to obtain orders, try again later.');
    },
  });
}

function requestOffers(callback, category) {
  $.ajax({
    url: API_BASE_URI + '/offers',
    data: {
      businessId: BUSINESS_ID,
      categoryId: category,
    },
    error: function() {
      alert('Unable to obtain offers, try again later.');
    },
    success: callback,
  });
}

function requestAdverts(callback, category) {
  $.ajax({
    url: API_BASE_URI + '/adverts',
    data: {
      businessId: BUSINESS_ID,
      categoryId: category,
    },
    error: function() {
      alert('Unable to obtain advertisings, try again later.');
    },
    success: callback,
  });
}

function requestCategories(type, callback) {
  $.ajax({
    url: API_BASE_URI + '/categories',
    data: {
      businessId: BUSINESS_ID,
      type: type,
    },
    error: function() {
      alert('Unable to obtain categories, try again later.');
    },
    success: callback,
  });
}

function requestBusiness(callback) {
  if (businessData) {
    callback(businessData);
  } else {
    $.ajax({
      url: API_BASE_URI + '/business',
      data: {
        businessId: BUSINESS_ID,
      },
      error: function() {
        alert('Unable to obtain business, try again later.');
      },
      success: function(data) {
        businessData = data;
        callback(businessData);
      },
    });
  }
}

function requestNews(callback, category) {
  $.ajax({
    url: API_BASE_URI + '/news',
    data: {
      businessId: BUSINESS_ID,
      categoryId: category,
    },
    error: function() {
      alert('Unable to obtain news, try again later.');
    },
    success: callback,
  });
}

function requestNewsItem(callback, newsId) {
  $.ajax({
    url: API_BASE_URI + '/news/' + newsId,
    data: {
      businessId: BUSINESS_ID,
    },
    error: function() {
      alert('Unable to obtain news, try again later.');
    },
    success: callback,
  });
}

function requestLocations(lat, lng, callback) {
  $.ajax({
    url: API_BASE_URI + '/locations',
    data: {
      businessId: BUSINESS_ID,
      lat: lat,
      lng: lng,
    },
    error: function() {
      alert('Unable to obtain locations, try again later.');
    },
    success: callback,
  });
}

function requestLocation(callback, locationId) {
  $.ajax({
    url: API_BASE_URI + '/locations/' + locationId,
    data: {
      businessId: BUSINESS_ID,
    },
    error: function() {
      alert('Unable to obtain location, try again later.');
    },
    success: callback,
  });
}

function requestNearestLocation(lat, lng, callback) {
  $.ajax({
    url: API_BASE_URI + '/locations/nearest',
    data: {
      businessId: BUSINESS_ID,
      lat: lat,
      lng: lng,
    },
    error: function() {
      alert('Unable to obtain location, try again later.');
    },
    success: callback,
  });
}

function requestAddToCart(productData, category) {
  var $button = $('#submit_order');
  $button.addClass('loading');
  selectedPosLocation = productData.locationId;

  $.ajax({
    url: API_BASE_URI + '/cart',
    method: 'POST',
    data: productData,
    complete: function() {
      $button.removeClass('loading');
    },
    success: function(data) {
      if (data && data.success) {
        cart = data.cart;
        $('#modal-order').modal('show');
        $('#continue-shopping').on('click', function() {
          controller.renderStrainsView(productData.location, category);
          $('.modal-backdrop').remove();
        });
      } else {
        alert('Error in transaction, try again or later');
      }
    },
    error: function() {
      alert('Error in transaction, try again or later');
    },
  });
}

function requestGetCart() {
  strainRequestPOSLocations(
    function(data) {
      selectedPosLocation = selectedPosLocation || data.locations[0].id;
      $.ajax({
        url: API_BASE_URI + '/cart',
        data: {
          locationId: selectedPosLocation,
        },
        method: 'GET',
        success: function(data) {
          if (data) {
            cart = data;
            controller.renderCartView();
          } else {
            $('#add-products').modal('show');
          }
        },
        error: function() {
          alert('Error in transaction, try again or later');
        },
      });
    },
    function() {
      alert('Error in getting locations, try again or later');
    }
  );
}

/*Remove items*/
function requestDeleteItemFromCart(index, location, callback) {
  $.ajax({
    url: API_BASE_URI + '/cart/delete-item',
    method: 'POST',
    data: {
      locationId: location,
      index: index,
    },
    success: function(data) {
      if (data && data.success) {
        cart = data.cart;
        callback();
      } else {
        alert('Error in transaction, try again or later');
      }
    },
    error: function() {
      alert('Error in transaction, try again or later');
    },
  });
}

function requestSubmitCart(location) {
  $('#complete-order').addClass('loading');
  $.ajax({
    url: API_BASE_URI + '/cart/submit',
    method: 'POST',
    data: {
      locationId: location,
    },
    complete: function() {
      $('#complete-order').removeClass('loading');
    },
    success: function() {
      $('#submitted-order').modal('show');
      cart = undefined;
    },
    error: function(xhr, textStatus) {
      if (xhr.status === 400) {
        xhr.responseJSON.forEach(function(error) {
          alert(
            'Error: ' +
              (error.field === '__all__' ? '' : error.field) +
              ' ' +
              error.description
          );
        });
      } else {
        console.log('error ' + xhr.status);
        alert('Error submitting cart.');
      }
      console.log(xhr, textStatus);
    },
  });
}

var controller = {
  bindEvents: function() {
    $('.account-button').on('click', this.onAccountClick);
    $('.home-button').on('click', this.onAccountClick);
    $('.tab-button').on('click', this.onTabClick);

    /**/
    $('#view-order').on('click', function() {
      controller.renderCartView();
      $('#modal-order').modal('hide');
    });
    /**/

    $('#start').click(function() {
      controller.renderStrainsView();
    });

    $('.toggle-menu ul li a').on('click', this.onAccountClick);
    $('.cart-icon a').on('click', this.onAccountClick);

    /*Log Out*/
    $('button.logout').click(function() {
      window.localStorage.setItem('LoggedIn', 'out');
      window.localStorage.removeItem('cartOrder');
      window.localStorage.removeItem('UserEmail');
      window.localStorage.removeItem('token');
      window.localStorage.setItem('renewNotification', 'disable');
      controller.renderLoginView();
      $('.profile .avatar img').attr('src', 'assets/img/profile.png');
    });

    $('.account-button').click(function(e) {
      $('.toggle-menu').slideToggle(200);
    });

    $('.toggle-menu ul li a').click(function(e) {
      $('.toggle-menu').slideUp(100);
    });

    $('button.back-home').click(function(e) {
      controller.renderHomeView();
      $(this).hide();
    });

    $('button.back-new').click(function(e) {
      controller.renderNewsView();
      $(this).hide();
    });

    $('button.back-loc').click(function(e) {
      controller.renderLocationsView();
      $(this).hide();
    });

    $('button.back-menu').click(function(e) {
      var location = $(this).data('location');
      var category = $(this).data('category');
      controller.renderStrainsView(location, category);
      $(this).hide();
    });

    $('button.back-order').click(function(e) {
      controller.renderProfileView('open-orders');
      $(this).hide();
    });
  },

  /*Track Click Events*/

  onAccountClick: function(e) {
    e.preventDefault();
    var button = $(this).data('button');

    if (button === 'sign-up') {
      controller.renderSignupView();
    } else if (button === 'profile') {
      controller.renderProfileView();
    } else if (button === 'login') {
      controller.renderLoginView();
    } else if (button === 'home') {
      controller.renderHomeView();
      $('.tab-button').removeClass('active-tab');
    } else if (button === 'points') {
      controller.renderProfileView('open-points');
    } else if (button === 'orders') {
      controller.renderProfileView('open-orders');
    } else if (button === 'cart') {
      requestGetCart();
    } else if (button === 'this-profile') {
      controller.renderProfileView('open-profile');
    } else if (button === 'alerts') {
      controller.renderProfileView('open-alerts');
    } else if (button === 'contact') {
      controller.renderProfileView('open-contact');
    } else if (button === 'logout') {
      window.localStorage.removeItem('token');
      window.localStorage.setItem('LoggedIn', 'out');
      window.localStorage.removeItem('cartOrder');
      window.localStorage.setItem('renewNotification', 'disable');
      controller.renderLoginView();
      $('.profile .avatar img').attr('src', 'assets/img/profile.png');
    }
  },

  onTabClick: function(e) {
    e.preventDefault();

    var button = $(this).data('tab');

    if (button === '#about') {
      controller.renderAboutView();
      $('.tab-button').removeClass('active-tab');
      $(this).addClass('active-tab');
    } else if (button === '#strains') {
      controller.renderStrainsView();
      $('.tab-button').removeClass('active-tab');
      $(this).addClass('active-tab');
    } else if (button === '#offers') {
      controller.renderOffersView();
      $('.tab-button').removeClass('active-tab');
      $(this).addClass('active-tab');
    } else if (button === '#news') {
      controller.renderNewsView();
      $('.tab-button').removeClass('active-tab');
      $(this).addClass('active-tab');
    } else if (button === '#locations') {
      controller.renderLocationsView();
      $('.tab-button').removeClass('active-tab');
      $(this).addClass('active-tab');
    }
  },

  /* ACCOUNT VIEWS */

  renderIntroView: function() {
    $('body').removeClass('app');
    $('body').addClass('account');

    var $tab = $('.page-wrap');
    $tab.empty();

    $('.page-wrap').load('./views/intro.html', function() {
      $('#age-verification').modal('show');

      $('.page-wrap')
        .find('#signup')
        .on('click', function() {
          controller.renderSignupView();
          window.localStorage.setItem('ageVerification', 'true');
        });

      $('.page-wrap')
        .find('#login')
        .on('click', function() {
          controller.renderLoginView();
          window.localStorage.setItem('ageVerification', 'true');
        });

      $('#over-age').on('click', function() {
        window.localStorage.setItem('ageVerification', 'true');
      });

      $('#under-age').on('click', function() {
        requestBusiness(function(business) {
          $('.page-wrap')
            .find('#skip-to-website')
            .on('click', function() {
              $(this).attr('href', business.externalWebsite);
            });

          if (device.platform.toUpperCase() === 'ANDROID') {
            navigator.app.loadUrl(business.externalWebsite, {
              openExternal: true,
            });
          } else if (device.platform.toUpperCase() === 'IOS') {
            cordova.InAppBrowser.open(
              business.externalWebsite,
              '_system',
              'location=yes'
            );
          }
        });
        window.localStorage.setItem('ageVerification', 'false');
      });

      $('.page-wrap')
        .find('.button-continue')
        .on('click', function() {
          $('body').addClass('guest');
          $('body').removeClass('logged-in');
          window.localStorage.setItem('LoggedIn', 'guest');
          window.localStorage.setItem(
            'ExpireTime',
            Date.now() + 2880 * 60 * 1000
          );
          controller.renderHomeView();
        });
    });
  },

  renderSignupView: function() {
    $('body').removeClass('app');
    $('body').addClass('account');

    var $tab = $('.page-wrap');
    $tab.empty();

    $('.page-wrap').load('./views/signup.html', function() {
      $('.page-wrap')
        .find('#register')
        .on('submit', strainRequestSignup);

      $('.page-wrap')
        .find('#login')
        .on('click', function() {
          controller.renderLoginView();
        });

      $('.page-wrap')
        .find('.button-continue')
        .on('click', function loginAsGuest() {
          $('body').addClass('guest');
          $('body').removeClass('logged-in');
          window.localStorage.setItem('LoggedIn', 'guest');
          window.localStorage.setItem(
            'ExpireTime',
            Date.now() + 2880 * 60 * 1000
          );

          controller.renderHomeView();
        });
    });
  },

  renderLostPasswordView: function() {
    $('body').removeClass('app');
    $('body').addClass('account');

    var $tab = $('.page-wrap');
    $tab.empty();
    $('.page-wrap').load('./views/lostpassword.html', function() {
      $('.page-wrap')
        .find('#reset')
        .on('submit', strainRequestForgotPassword);

      $('.page-wrap')
        .find('#login')
        .on('click', function() {
          controller.renderLoginView();
        });
    });
  },

  renderLoginView: function() {
    $('body').removeClass('app');
    $('body').addClass('account');

    var $tab = $('.page-wrap');
    $tab.empty();

    $('.page-wrap').load('./views/login.html', function() {
      $('.page-wrap')
        .find('#login')
        .on('submit', strainRequestLogin);

      $('.page-wrap')
        .find('#lost-password')
        .on('click', function() {
          controller.renderLostPasswordView();
        });

      $('.page-wrap')
        .find('#signup-here')
        .on('click', function() {
          controller.renderSignupView();
        });

      $('.page-wrap')
        .find('.button-continue')
        .on('click', function() {
          $('body').addClass('guest');
          $('body').removeClass('logged-in');
          window.localStorage.setItem('LoggedIn', 'guest');
          window.localStorage.setItem(
            'ExpireTime',
            Date.now() + 2880 * 60 * 1000
          );

          controller.renderHomeView();
        });
    });
  },

  /* IN APP VIEWS */

  renderHomeView: function() {
    $('body').removeClass('account');
    $('body').addClass('app');

    $('.back-home').hide();
    $('.back-loc').hide();
    $('.back-new').hide();
    $('.back-menu').hide();
    $('.back-order').hide();

    $('.app-return').removeClass('hidden-logout');

    var $tab = $('.page-wrap');
    $tab.empty();

    $('.page-wrap').load('./views/app-home.html', function() {
      var typeuser = window.localStorage.getItem('LoggedIn');

      if (typeuser == 'in') {
        $('.home-signup').hide();
        $('.app-return button.logout').hide();

        var uid = window.localStorage.getItem('UserWP');
        var storedIMG = window.localStorage.getItem(uid + 'profile_user_img');

        if (storedIMG) {
          $('.profile .avatar img').addClass('custom');
          $('.profile .avatar img').attr('src', storedIMG);
        }
      } else {
        $('.app-return button.logout').show();
      }

      /*---------------------------------------------------------------*/

      if (typeuser == 'in') {
        $.ajax({
          url: API_BASE_URI + '/pos/me',
          method: 'GET',
          error: function() {
            alert('Unable to obtain data, try again later.');
          },
          success: function(data) {
            // NOTE. Session ended
            if (!data.fullName && !data.lastName) {
              window.localStorage.setItem('LoggedIn', 'out');
              controller.renderLoginView();
              return;
            }

            var fullname = data.firstName + ' ' + data.lastName;

            window.localStorage.setItem('UserFullName', fullname);
            window.localStorage.setItem('UserPhone', data.phoneNumber);
            window.localStorage.setItem('MainID', data.id);
            window.localStorage.setItem('CardIdNumber', data.patientId);
            window.localStorage.setItem('UserPoints', data.points);
            window.localStorage.setItem('CardExpires', data.cardExpiresAt);
            window.localStorage.setItem('CardCreated', data.cardCreatedAt);
            window.localStorage.setItem('unixExpireDate', data.cardExpiresAt);

            $('.points-redeem .r-text').html(
              '<span>Hi ' +
                data.firstName +
                ' you<br> have <span class="number">' +
                data.points +
                '</span> points</span>'
            );

            window.setTimeout(function() {
              JsBarcode('#mybarcode', data.patientId, {
                lineColor: '#000',
                width: 2,
                height: 50,
                displayValue: false,
              });
            }, 0);
          },
        });
      }

      /*---------------------------------------------------------------*/

      requestOffers(function(data) {
        data.offers.forEach(function(offer) {
          $('<li/>', {
            class: 'item',
            html: '<img src="' + offer.image + '"><h5>' + offer.title + '</h5>',
          }).appendTo('.lastest-offers #slider');
        });

        $('#slider').owlCarousel({
          loop: false,
          margin: 15,
          nav: false,
          stagePadding: 50,
          responsive: {
            0: {
              items: 1,
            },
            600: {
              items: 1,
            },
            1000: {
              items: 1,
            },
          },
        });

        $('.page-wrap')
          .find('.lastest-offers ul.list li')
          .on('click', function() {
            controller.renderOffersView();
          });
      });

      requestAdverts(function(data) {
        data.adverts.forEach(function(advert) {
          $('<li/>', {
            class: 'item',
            html: '<img src="' + advert.image + '">',
          }).appendTo('.lastest-adverts #slider-advert');
        });

        $('#slider-advert').owlCarousel({
          loop: true,
          nav: false,
          dots: false,
          autoplay: true,
          autoplayHoverPause: true,
          // stagePadding: 50,
          responsive: {
            0: {
              items: 1,
            },
            600: {
              items: 1,
            },
            1000: {
              items: 1,
            },
          },
        });
      });
      /*----------------------------------------------------------------*/

      $('.page-wrap')
        .find('#more-offers')
        .on('click', function() {
          controller.renderOffersView();
        });

      /*----------------------------------------------------------------*/

      $('.page-wrap')
        .find('#submit-form')
        .on('click', function() {
          $.ajax({
            url: API_BASE_URI + '/request-license',
            method: 'POST',
            data: {
              businessId: BUSINESS_ID,
              fullName: $('#request-name').val(),
              phoneNumber: $('#request-phone').val(),
            },
            success: function(response) {
              if (response.success) {
                $('#home-contact').trigger('reset');
                $('#form-alert').modal('show');
              } else {
                $('#form-message').html(response.message);
                $('#form-message').collapse();
              }
            },
          });
        });

      /*----------------------------------------------------------------*/

      requestBusiness(function(business) {
        $('.page-wrap')
          .find('.download-directorio a')
          .on('click', function() {
            cordova.InAppBrowser.open(
              business.doctorsDirectoryFile,
              '_system',
              'location=yes'
            );
          });

        $('.page-wrap')
          .find('.download-formulario a')
          .on('click', function() {
            cordova.InAppBrowser.open(
              business.patientFormsFile,
              '_system',
              'location=yes'
            );
          });

        $('#medical-center-name').text(business.medicalCenterName);
        $('#medical-center-logo, #medical-center-logo-modal').attr(
          'src',
          business.medicalCenterImage
        );
      });

      /*----------------------------------------------------------------*/

      if (typeuser == 'in') {
        $('.page-wrap')
          .find('.store-pickup')
          .on('click', function() {
            controller.renderProfileView('open-orders');
          });
      } else {
        $('.page-wrap')
          .find('.store-pickup')
          .css('background', '#f8f8f8');

        $('.page-wrap')
          .find('.store-pickup')
          .on('click', function() {
            $('#unclock-feature').modal('show');
          });

        $('#create-account').click(function() {
          controller.renderSignupView();
          $('.modal-backdrop').remove();
        });
      }

      /*----------------------------------------------------------------*/

      navigator.geolocation.getCurrentPosition(
        function onNearLocationSuccess(position) {
          var HLatitude = position.coords.latitude;
          var HLongitude = position.coords.longitude;

          window.localStorage.setItem('current_latitude', HLatitude);
          window.localStorage.setItem('current_longitude', HLongitude);
          requestNearestLocation(HLatitude, HLongitude, function(location) {
            if (location && location.point) {
              var mapUrl = formatURLMap(
                location.point.coordinates[0],
                location.point.coordinates[1]
              );
              $('.zone-label h5').html(location.name);
              $('.get-button a').attr('href', mapUrl);
            }
          });
        },
        function onNearLocationError(error) {
          console.log(
            'code: ' + error.code + '\n' + 'message: ' + error.message + '\n'
          );
        },
        { enableHighAccuracy: true }
      );

      /*----------------------------------------------------------------*/

      $('.page-wrap')
        .find('#join')
        .on('click', function() {
          controller.renderSignupView();
        });
    });
  },

  renderProfileView: function(front) {
    $('.tab-button').removeClass('active-tab');
    $('body').removeClass('account');
    $('body').addClass('app');
    $('.app-return button.logout').hide();

    $('.back-home').show();
    $('.back-loc').hide();
    $('.back-new').hide();
    $('.back-menu').hide();
    $('.back-order').hide();

    var $tab = $('.page-wrap');
    $tab.empty();

    $('.page-wrap').load('./views/profile.html', function() {
      var $locationSelector = $('#location-selector');

      // Opens the alert view
      if (front == 'open-orders') {
        $('#orders-nav a').trigger('click');
      } else if (front == 'open-points') {
        $('#points-nav a').trigger('click');
      } else if (front == 'open-profile') {
        $('#profile-nav a').trigger('click');
      } else if (front == 'open-alerts') {
        $('#alerts-nav a').trigger('click');
      } else if (front == 'open-contact') {
        $('#contact-nav a').trigger('click');
      }

      // check and Put the profile image
      var uid = window.localStorage.getItem('UserWP');
      var storedIMG = window.localStorage.getItem(uid + 'profile_user_img');
      if (storedIMG) {
        $('.patient-info .pic img').attr('src', storedIMG);
      }

      /*--------------------------------------------------------------*/
      //------------------- PROFILE & USER POINTS
      /*--------------------------------------------------------------*/

      var idnumber = window.localStorage.getItem('CardIdNumber');
      var created = window.localStorage.getItem('CardCreated');
      var expires = window.localStorage.getItem('CardExpires');
      var fullname = window.localStorage.getItem('UserFullName');
      var userpoints = window.localStorage.getItem('UserPoints');

      $('.full-name').html(fullname);
      $('.card-number').html(idnumber);

      /* Card Dates*/
      $('.patient-since-year').html(moment(created).format('YYYY'));
      $('.registered-date').html(moment(created).format('MMM/YYYY'));
      $('.expires-date').html(moment(expires).format('MMM/YYYY'));

      /*Barcode*/

      window.setTimeout(function() {
        JsBarcode('#barcode', idnumber, {
          lineColor: '#000',
          width: 2,
          height: 50,
          displayValue: false,
        });
      }, 0);

      /*Meter Graphic*/
      $('#myValues').val(userpoints);
      $('#myValues').myfunc({
        divFact: 50,
        gagueLabel: 'Points Available',
        maxVal: 1000,
        dangerLevel: 800,
      });

      $('#myValues').trigger('change');

      $('#user-preferences .submit-bt').on('click', function() {
        var currentpass = $('#user-current-pass').val();
        var newpass = $('#user-new-pass').val();

        var storedPass = window.localStorage.getItem('UserPassword');

        if (newpass) {
          if (currentpass == storedPass) {
            $.ajax({
              url: API_BASE_URI + '/user/change-password',
              method: 'POST',
              data: {
                businessId: BUSINESS_ID,
                password: newpass,
                oldPassword: currentpass,
              },

              success: function() {
                alert('Password changed successfully');

                if ($('input#notifications').is(':checked')) {
                  window.localStorage.setItem('UserNotifications', 'enable');
                } else {
                  window.localStorage.setItem('UserNotifications', 'disabled');
                }

                window.localStorage.removeItem('token');
                window.localStorage.setItem('LoggedIn', 'out');
                controller.renderLoginView();
              },

              complete: function(xhr) {
                console.log('complete ' + xhr.status);
              },

              error: function(xhr) {
                console.log('error ' + xhr.status);
                if (xhr.status === 400) {
                  xhr.responseJSON.forEach(function(error) {
                    if (error.field === 'patientId') {
                      $('#notfound').modal('show');
                    } else {
                      alert('Error: ' + error.field + ' ' + error.description);
                    }
                  });
                } else {
                  console.log('error ' + xhr.status);
                  alert('Error creating user.');
                }
              },
            });
          } else {
            alert('Wrong Password.');
          }
        }
      });

      /*--------------------------------------------------------------*/
      //------------------- CONTACT
      /*--------------------------------------------------------------*/

      $('.page-wrap')
        .find('#submit-form')
        .on('click', function() {
          var the_name = $('#fname').val();
          var the_phone = $('#ftelephone').val();
          var the_email = $('#femail').val();
          var the_message = $('#message').val();

          $.ajax({
            url: API_BASE_URI + '/contact-us',
            method: 'POST',
            data: {
              businessId: BUSINESS_ID,
              fullName: the_name,
              phoneNumber: the_phone,
              email: the_email,
              message: the_message,
            },
            success: function(response) {
              if (response.success) {
                $('#profile-contact-form').trigger('reset');
                alert(response.message);
              } else {
                alert(response.message);
              }
            },
          });
        });

      /*--------------------------------------------------------------*/
      //------------------- ORDERS
      /*--------------------------------------------------------------*/
      requestBusiness(function(business) {
        var loggedUser = window.localStorage.getItem('LoggedIn') === 'in';
        var isTestUser =
          window.localStorage.getItem('UserEmail') === USER_TEST_EMAIL;

        if (business.allowCart === true && loggedUser && !isTestUser) {
          $('#start-order').removeClass('hide');
        }
      });

      function renderCompletedOrders(orders, locationId) {
        orders.forEach(function(order, index) {
          var status = 'Completed';
          var button_text = 'View Order';
          var classStatus = 'completed';
          var orderItemClass = 'order-item order-completed';

          switch (order.status) {
            case 'open':
              status = 'New Order';
              classStatus = 'new-order';
              orderItemClass = 'order-item empty-items';
              break;

            case 'waiting_for_pickup':
              status = 'Waiting for Pick Up';
              classStatus = 'new-order';
              orderItemClass = 'order-item with-items';
              break;

            case 'cancelled':
              status = 'Cancelled';
              classStatus = 'cancelled-closed';
              break;

            default:
          }

          $('<li/>', {
            class: orderItemClass,
            html:
              '<div class="' +
              orderItemClass +
              '"><div id="' +
              index +
              '" class="order-date"><span>Date: </span>' +
              moment(order.createdAt).format('MMM DD, YYYY') +
              '</div><div class="order-number"><span>Order Number: </span>' +
              order.id +
              '</div><div class="order-total"><span>Total: </span>$' +
              order.total +
              '</div><div class="order-status"><span>Status: </span><span class="' +
              classStatus +
              '">' +
              status +
              '</span></div><div class="order-action"><button data-location="' +
              locationId +
              '" data-href="' +
              order.id +
              '">' +
              button_text +
              '</button></div></div>',
          }).appendTo('.user-orders #completed-orders ul');
        });

        $('.page-wrap')
          .find('#completed-orders .order-item button')
          .on('click', function() {
            facility = $(this).data('location');
            orderid = $(this).data('href');
            controller.renderSingleOrderView(orderid, facility);
          });
      }

      strainRequestPOSLocations(
        function(locationsData) {
          // Render locations into selector
          locationsData.locations.forEach(function(locationData) {
            $('<option>', {
              value: locationData.id,
              text: locationData.name,
            }).appendTo($locationSelector);
          });
          $('#completed-orders ul').empty();
          $('#open-orders ul').empty();

          strainRequestPOSOrders(
            'completed',
            $locationSelector.val(),
            renderCompletedOrders
          );
        },
        function() {
          alert('Unable to obtain locations, try again later.');
        }
      );

      /*filter*/

      $('.order-tools .filter-menu').on('change', function() {
        $('#completed-orders ul').empty();
        $('#open-orders ul').empty();
        selectedPosLocation = $locationSelector.val();
        strainRequestPOSOrders(
          'completed',
          selectedPosLocation,
          renderCompletedOrders
        );
      });

      $('#orders #start-order').on('click', function() {
        controller.renderStrainsView();
      });

      /*--------------------------------------------------------------*/
      //------------------- ALERTS
      /*--------------------------------------------------------------*/

      $.ajax({
        url: API_BASE_URI + '/notifications',
        error: function() {
          alert('Unable to obtain notifications, try again later.');
        },
        success: function(notificationsResponse) {
          notificationsResponse.notifications.forEach(function(notification) {
            var $item = $('<li/>', {
              class: 'item',
              html:
                '<div class="alert-text"><span class="alert-cat medium">' +
                notification.title +
                '</span><div class="alert-date">' +
                moment(notification.wasSentAt).format('MMM DD, YYYY') +
                '</div><div class="alert-content">' +
                notification.message +
                '</div></div>',
            });
            if (notification.image !== '' && notification.image != null) {
              $('<div/>', {
                html:
                  '<img style="padding-top: 10px; width: 100%" src="' +
                  notification.image +
                  '" >',
              }).appendTo($item.find('.alert-text'));
            }
            $item.appendTo('#alert .alert-list');
          });
        },
      });

      /*--------------------------------------------------------------*/
      //------------------- UPLOAD PICTURES
      /*--------------------------------------------------------------*/

      $('.patient-info .pic img').on('click', function() {
        navigator.camera.getPicture(onSuccess, onFail, {
          quality: 80,
          targetWidth: 150,
          targetHeight: 150,
          savetoPhotoAlbum: true,
          encodingType: Camera.EncodingType.FILE_URI,
          sourceType: Camera.PictureSourceType.PHOTOLIBRARY,
          allowEdit: true,
          destinationType: Camera.DestinationType.FILE_URI,
        });
      });

      function onSuccess(imageData) {
        var xuid = window.localStorage.getItem('UserWP');
        window.localStorage.setItem(xuid + 'profile_user_img', imageData);
        var storedIMG = window.localStorage.getItem(xuid + 'profile_user_img');
        $('.profile .avatar img').attr('src', storedIMG);
        $('.patient-info .pic img').attr('src', storedIMG);
      }

      function onFail(message) {
        alert(message);
      }

      /*--------------------------------------------------------------*/

      var typeuser = window.localStorage.getItem('LoggedIn');
      if (typeuser == 'in') {
        /*Card Reminder*/

        var uid = window.localStorage.getItem('UserWP');
        var expires = window.localStorage.getItem('unixExpireDate');
        var date_checker = Number(Date.now() + 30 * 8356600 * 1000);
        var status = window.localStorage.getItem('renewNotification');
        var next_reminder = window.localStorage.getItem(uid + 'reminderDate');
        var nowTime = Date.now();
        var skipped = window.localStorage.getItem(uid + 'skipped');

        if (date_checker > expires && status == 'disable') {
          if (skipped == 'yes') {
            if (nowTime > next_reminder) {
              //console.log('Card ID Expires soon - 5 days expired - 03');
              controller.renderNotificationView();
            } else {
              //console.log('Expired, but still in 5 days of grace - 02');
            }
          } else {
            //console.log('Card ID Expires soon - 01');
            controller.renderNotificationView();
          }
        } else {
        }
      }

      /*--------------------------------------------------------------*/
    });
  },

  renderAboutView: function() {
    $('body').removeClass('account');
    $('body').addClass('app');
    $('.app-return button.logout').hide();

    $('.back-home').show();
    $('.back-loc').hide();
    $('.back-new').hide();
    $('.back-menu').hide();
    $('.back-order').hide();

    var $tab = $('.page-wrap');
    $tab.empty();
    $('.page-wrap').load('./views/about.html', function() {
      requestBusiness(function(business) {
        $('#about-image').attr('src', business.aboutImage);
        $('.about-content .the-content').html(business.about);
      });

      // $('.owl-carousel').owlCarousel({
      //   loop: true,
      //   margin: 10,
      //   nav: false,
      //   responsive: {
      //     0: {
      //       items: 1,
      //     },
      //     600: {
      //       items: 1,
      //     },
      //     1000: {
      //       items: 1,
      //     },
      //   },
      // });
    });
  },

  renderStrainsView: function(openLocation, openCategory) {
    $('body').removeClass('account');
    $('body').addClass('app');
    $('.app-return button.logout').hide();

    $('.back-home').show();
    $('.back-loc').hide();
    $('.back-new').hide();
    $('.back-menu').hide();
    $('.back-order').hide();

    openCategory = openCategory == null ? null : openCategory;

    var $tab = $('.page-wrap');
    $tab.empty();

    $('.page-wrap').load('./views/strains.html', function() {
      var $locationSelector = $('#location-selector');
      var $categoriesSelector = $('#cat-selector');
      var $productList = $('.strain-list');

      var limit = 9;
      var offset = 0;

      function requestPOSCategories() {
        selectedPosLocation = $locationSelector.val();
        strainRequestPOSCategories(
          selectedPosLocation,
          function(categoriesData) {
            $categoriesSelector.empty();
            $('<option>', {
              value: '',
              text: 'Select Category',
            }).appendTo($categoriesSelector);

            categoriesData.categories.forEach(function(categoryData) {
              $('<option>', {
                value: categoryData.id,
                text: categoryData.name,
                selected: categoryData.id == openCategory,
              }).appendTo($categoriesSelector);
            });
            requestPOSProducts();
          },
          function() {
            $('.shimmer-strains').hide();

            alert('Unable to obtain categories, try again later.');
          },
          function() {
            limit = 9;
            offset = 0;
            $productList.empty();
            $('.load-more').hide();
          }
        );
      }

      strainRequestPOSLocations(
        function(locationsData) {
          // Render locations into selector
          locationsData.locations.forEach(function(locationData) {
            $('<option>', {
              value: locationData.id,
              text: locationData.name,
              selected: locationData.id == openLocation,
            }).appendTo($locationSelector);
          });

          // Request strain pos categories
          requestPOSCategories();
        },
        function() {
          alert('Unable to obtain locations, try again later.');
        }
      );

      function requestPOSProducts() {
        var categoryId = $categoriesSelector.val();
        $('.shimmer-strains').show();

        $.ajax({
          url: API_BASE_URI + '/pos/products',
          method: 'GET',
          data: {
            businessId: BUSINESS_ID,
            locationId: $locationSelector.val(),
            categoryId: categoryId === '' ? undefined : categoryId,
            limit: limit,
            offset: offset,
          },
          success: function(data) {
            $('.shimmer-strains').hide();
            data.products.forEach(function(product) {
              var image = product.image || 'assets/img/strains.png';
              var availableText =
                product.quantityUOM === 'GR'
                  ? 'Grams Available'
                  : 'Qty Available';

              $('<div/>', {
                class: 'menu-item',
                html:
                  '<a data-href="' +
                  product.itemNumber +
                  '"><div class="item-image"><img src="' +
                  image +
                  '"></div><div class="item-details"><h4>' +
                  product.name +
                  '</h4><h6>' +
                  product.category.name +
                  '</h6><div class="item-price"><span>$</span>' +
                  product.pricing.price +
                  '<h6 class="qty-item hide">' +
                  availableText +
                  ': <strong style="font-weight:600">' +
                  product.quantity +
                  '</strong></h6></div></div></a>',
              }).appendTo($productList);
            });

            requestBusiness(function(business) {
              var loggedUser = window.localStorage.getItem('LoggedIn') === 'in';
              var isTestUser =
                window.localStorage.getItem('UserEmail') === USER_TEST_EMAIL;

              if (business.allowCart === true && loggedUser && !isTestUser) {
                $productList.find('.qty-item').removeClass('hide');
              }
            });

            $productList.find('.menu-item a').on('click', function() {
              var productId = $(this).data('href');
              $('.back-menu').data('location', $locationSelector.val());
              $('.back-menu').data('category', $categoriesSelector.val());
              controller.renderSingleMenuView(
                productId,
                $locationSelector.val()
              );
            });

            if (data.products.length === 0) {
              $('.load-more').hide();
            } else {
              $('.load-more').show();
            }
          },
          error: function() {
            $('.shimmer-strains').hide();

            alert('Unable to obtain products, try again later.');
          },
        });
      }

      $locationSelector.on('change', function() {
        requestPOSCategories();
      });

      $categoriesSelector.on('change', function() {
        limit = 9;
        offset = 0;
        $productList.empty();
        $('.load-more').hide();
        requestPOSProducts();
      });

      $('.load-more button').on('click', function() {
        offset = offset + limit;
        requestPOSProducts();
      });
    });
  },

  renderOffersView: function() {
    $('body').removeClass('account');
    $('body').addClass('app');
    $('.app-return button.logout').hide();

    $('.back-home').show();
    $('.back-loc').hide();
    $('.back-new').hide();
    $('.back-menu').hide();
    $('.back-order').hide();

    var $tab = $('.page-wrap');
    $tab.empty();

    $('.page-wrap').load('./views/offers.html', function() {
      function loadOffers() {
        var selectedCategory = $('.offers-filter select').val();
        $('.offer-list #slider').empty();

        requestOffers(function(data) {
          $('.shimmer-offers').hide();

          data.offers.forEach(function(offer) {
            $('<div/>', {
              class: 'item',
              html: '<img src="' + offer.image + '">',
            }).appendTo('.offer-list #slider');
          });
        }, selectedCategory);
      }

      requestCategories('OFFER', function(data) {
        data.categories.forEach(function(category) {
          $('<option/>', {
            value: category.id,
            text: category.name,
          }).appendTo('.offers-filter select');
        });
      });

      $('.offers-filter select').change(function() {
        $('.shimmer-offers').show();
        loadOffers();
      });

      loadOffers();
    });
  },

  renderLocationsView: function() {
    $('body').removeClass('account');
    $('body').addClass('app');
    $('.app-return button.logout').hide();

    $('.back-home').show();
    $('.back-loc').hide();
    $('.back-new').hide();
    $('.back-menu').hide();
    $('.back-order').hide();

    var $tab = $('.page-wrap');
    $tab.empty();
    $('.page-wrap').load('./views/locations.html', function() {
      navigator.geolocation.getCurrentPosition(
        function onNearLocationSuccess(position) {
          var HLatitude = position.coords.latitude;
          var HLongitude = position.coords.longitude;

          requestLocations(HLatitude, HLongitude, function(locationResponse) {
            $('.shimmer-locations').hide();

            locationResponse.locations.map(function(location, i) {
              var lat2 = location.point.coordinates[0];
              var lng2 = location.point.coordinates[1];
              var lat1 = window.localStorage.getItem('current_latitude');
              var lng1 = window.localStorage.getItem('current_longitude');
              var currentDistance = parseInt(
                distance(lat1, lng1, lat2, lng2, 'M')
              );
              var urlMap = formatURLMap(lat2, lng2);
              var status = isLocationOpen(location.openHours)
                ? 'open'
                : 'closed';
              $('<div/>', {
                class: 'location-item',
                html:
                  '<h4 data-href="' +
                  location.id +
                  '" class="title ' +
                  status +
                  '">' +
                  location.name +
                  '</h4><div class="map-holder"><a class="link" href="' +
                  urlMap +
                  '"><div class="map" id="map-canvas' +
                  (i + 1) +
                  '"></div></a></div><div class="location-footer"><div class="buttons"><a data-href="' +
                  location.id +
                  '" target="_blank" class="openin learn-button">Learn More</a><span>&nbsp;</span><a href="tel:' +
                  location.phoneNumber +
                  '" class="callus">Call</a></div><div class="distance"><img src="assets/img/pin-outline.png"><span class="data">' +
                  currentDistance +
                  ' miles away</span></div><div class="status"></div><div>',
              }).appendTo('.location-list');

              var point = location.point.coordinates;
              var latlng = new google.maps.LatLng(point[0], point[1]);

              var map = new google.maps.Map(
                document.getElementById('map-canvas' + (i + 1)),
                {
                  zoom: 10,
                  center: latlng,
                  zoomControl: false,
                  scaleControl: false,
                  mapTypeControl: false,
                  fullscreenControl: false,
                  streetViewControl: false,
                }
              );

              new google.maps.Marker({
                position: latlng,
                map: map,
              });
            });

            $('.page-wrap .location-item')
              .find('h4.title, .learn-button')
              .on('click', function() {
                var post_id = $(this).data('href');
                controller.renderSingleLocationView(post_id);
              });
          });
        },
        function onNearLocationError(error) {
          console.log(
            'code: ' + error.code + '\n' + 'message: ' + error.message + '\n'
          );
        },
        { enableHighAccuracy: true }
      );
    });
  },

  renderSingleLocationView: function(post_id) {
    $('body').removeClass('account');
    $('body').addClass('app');
    $('.app-return button.logout').hide();

    $('.back-menu').hide();
    $('.back-loc').show();
    $('.back-home').hide();

    var $tab = $('.page-wrap');
    $tab.empty();
    $('.page-wrap').load('./views/single-location.html', function() {
      requestLocation(function(location) {
        var lat2 = location.point.coordinates[0];
        var lng2 = location.point.coordinates[1];
        var mapUrl = formatURLMap(lat2, lng2);
        var status = isLocationOpen(location.openHours) ? 'open' : 'closed';
        var myLatLng = new google.maps.LatLng(lat2, lng2);

        var map = new google.maps.Map(document.getElementById('map-canvas'), {
          zoom: 14,
          center: myLatLng,
          zoomControl: false,
          scaleControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
          streetViewControl: false,
        });

        new google.maps.Marker({
          position: myLatLng,
          map: map,
        });

        $('.store-name').html(location.name);
        // $('.map-holder img').attr('src', data.store_image);
        $('li.phone').html(
          '<a href="tel:' +
            location.phoneNumber +
            '">' +
            formatPhoneNumber(location.phoneNumber) +
            '</a>'
        );
        $('li.address').html(location.address);
        $('li.mail').html(
          '<a href="mailto:' + location.email + '">' + location.email + '</a>'
        );
        $('li.url').html(
          '<a href="' + location.website + '">' + location.website + '</a>'
        );

        $('.store-details').addClass(status);

        $('.openin').attr('href', mapUrl);
        $('.callus').attr('href', 'tel:' + location.phoneNumber);

        $('.day1').html('Mon. ' + formatHour('MONDAY', location.openHours));
        $('.day2').html('Tue. ' + formatHour('TUESDAY', location.openHours));
        $('.day3').html('Wed. ' + formatHour('WEDNESDAY', location.openHours));
        $('.day4').html('Thu. ' + formatHour('THURSDAY', location.openHours));
        $('.day5').html('Fri. ' + formatHour('FRIDAY', location.openHours));
        $('.day6').html('Sat. ' + formatHour('SATURDAY', location.openHours));
        $('.day7').html('Sun. ' + formatHour('SUNDAY', location.openHours));

        location.productsAndServices.map(function(productOrService) {
          var name = titleCase(productOrService);
          $('<li/>', {
            class: 'item',
            html:
              '<img src="assets/img/' +
              name +
              '.png"><span>' +
              name +
              '</span>',
          }).appendTo('ul.list');
        });
      }, post_id);
    });
  },

  renderNewsView: function() {
    $('body').removeClass('account');
    $('body').addClass('app');
    $('.app-return button.logout').hide();

    $('.back-home').show();
    $('.back-loc').hide();
    $('.back-new').hide();
    $('.back-menu').hide();
    $('.back-order').hide();

    var $tab = $('.page-wrap');
    $tab.empty();
    $('.page-wrap').load('./views/news.html', function() {
      requestNews(function(responseData) {
        $('.shimmer-news').hide();

        responseData.news.forEach(function(newsItem) {
          var categoryName = newsItem.categories[0]
            ? newsItem.categories[0].name
            : 'No category';

          $('<article/>', {
            id: newsItem.id,
            class: 'news-item',
            html:
              '<div class="post-image"><div class="post-cat"><span>' +
              categoryName +
              '<span></div><a class="link" data-href="' +
              newsItem.id +
              '"><img src="' +
              newsItem.image +
              '"></a></div><div class="post-meta"><a class="link" data-href="' +
              newsItem.id +
              '"><h2>' +
              newsItem.title +
              '</h2></a><div class="post-date">' +
              moment(newsItem.updatedAt).format('MMM DD, YYYY') +
              '</div><div class="share"></div></div><div class="post-excerpt"><p>' +
              newsItem.excerpt +
              '</p></div>',
          }).appendTo('.post-list');
        });

        $('.page-wrap .news-item')
          .find('a.link')
          .on('click', function() {
            var post_id = $(this).data('href');
            controller.renderSingleNewView(post_id);
          });
      });
    });
  },

  renderSingleNewView: function(post_id) {
    $('body').removeClass('account');
    $('body').addClass('app');
    $('.app-return button.logout').hide();

    $('.back-new').show();
    $('.app-return').addClass('hidden-logout');
    $('.back-home').hide();

    var $tab = $('.page-wrap');
    $tab.empty();
    $('.page-wrap').load('./views/single-new.html', function() {
      requestNewsItem(function(newsItem) {
        var categoryName = newsItem.categories[0]
          ? newsItem.categories[0].name
          : 'No category';

        $('<div/>', {
          class: 'new-item',
          html:
            '<div class="heading"><img src="' +
            newsItem.image +
            '"></div><article class="news-item"><div class="post-meta"><h2>' +
            newsItem.title +
            '</h2><div class="post-date">' +
            moment(newsItem.updatedAt).format('MMM DD, YYYY') +
            '</div><div class="post-cat">' +
            categoryName +
            '</div><div class="share"></div></div><div class="post-content">' +
            newsItem.content +
            '</div></article>',
        }).appendTo('.single-new-content');

        $(".single-new-content a[href^='http']").attr('target', '_blank');
      }, post_id);
    });
  },

  renderNotificationView: function() {
    $('body').removeClass('account');
    $('body').addClass('app');
    $('.app-return button.logout').hide();

    $('.back-loc').hide();
    $('.back-new').hide();
    $('.back-menu').hide();
    $('.back-order').hide();

    $('.app-return').removeClass('hidden-logout');

    var $tab = $('.page-wrap');
    $tab.empty();
    $('.page-wrap').load('./views/notification.html', function() {
      requestBusiness(function(business) {
        $('#medical-center-name').text(business.medicalCenterName);
        $('#medical-center-logo-modal').attr(
          'src',
          business.medicalCenterImage
        );

        $('.page-wrap')
          .find('#renew')
          .on('click', function() {
            /*Accion
                1) -- Enviar un mail con los datos
                2) - desabilitar la notificacion
*/

            window.localStorage.setItem('renewNotification', 'enable');

            $.ajax({
              url: API_BASE_URI + '/request-license',
              method: 'POST',
              data: {
                businessId: BUSINESS_ID,
                fullName: the_name,
                phoneNumber: the_phone,
              },
              success: function(response) {
                if (response.success) {
                  $('#form-alert').modal('show');
                } else {
                  alert(response.message);
                }
              },
            });
          });

        $('.page-wrap')
          .find('#skip')
          .on('click', function() {
            /*Add 5 days more*/
            var uid = window.localStorage.getItem('UserWP');

            var reminderDate = Date.now() + 5 * 8356600 * 1000;
            window.localStorage.setItem(uid + 'reminderDate', reminderDate);
            window.localStorage.setItem('renewNotification', 'disable');
            window.localStorage.setItem(uid + 'skipped', 'yes');

            //console.log('Next reminder will be: ' + reminderDate);

            controller.renderProfileView();
          });

        $('.page-wrap')
          .find('#close')
          .on('click', function() {
            controller.renderHomeView();
            $('.modal-backdrop').remove();
          });
      });
    });
  },

  renderSingleMenuView: function(productId, location) {
    $('body').removeClass('account');
    $('body').addClass('app');
    $('.app-return button.logout').hide();

    $('.back-menu').show();
    $('.app-return').addClass('hidden-logout');
    $('.back-home').hide();

    var $tab = $('.page-wrap');
    $tab.empty();

    $('.page-wrap').load('./views/single-menu.html', function() {
      requestBusiness(function(business) {
        var loggedUser = window.localStorage.getItem('LoggedIn') === 'in';
        var isTestUser =
          window.localStorage.getItem('UserEmail') === USER_TEST_EMAIL;

        if (business.allowCart === true && loggedUser && !isTestUser) {
          $('.submit-order button').removeClass('hide');
        }
      });

      $('.shimmer-single-menu').show();

      $.ajax({
        url: API_BASE_URI + '/pos/products/' + productId + '/' + location,
        method: 'GET',
        data: {
          businessId: BUSINESS_ID,
        },
        success: function(productData) {
          $('.shimmer-single-menu').hide();

          var image = productData.image || 'assets/img/strains.png';

          $('.post-title h1').text(productData.name);
          $('.post-cat').text(productData.category.name);
          $('.heading img').attr('src', image);
          $('.item-quantity strong').text(productData.quantity);
          $('.post-content').text(productData.description);
          $('#product_available').val(productData.quantity);
          $('#quantity').attr('max', productData.quantity);
          $('#price').val('$' + productData.pricing.price);
          $('#price-text').text('$' + productData.pricing.price);
          $('#hprice').val('$' + productData.pricing.price);

          // Form data
          if (productData.pricing && productData.pricing.options) {
            productData.pricing.options.map(function(pricing) {
              $('<li/>', {
                class: 'price-item',
                html:
                  '<input type="radio" id="' +
                  pricing.name +
                  '" name="price-selector" data-price="' +
                  pricing.price +
                  '" data-name=" ' +
                  pricing.name +
                  '" data-weight="' +
                  pricing.weight +
                  '" value="' +
                  pricing.id +
                  '" data-uom="' +
                  pricing.uom +
                  '"><label class="' +
                  (parseFloat(pricing.weight) > parseFloat(productData.quantity)
                    ? 'disabled'
                    : 'available') +
                  '" for="' +
                  pricing.name +
                  '"><div class="price-name">' +
                  pricing.name +
                  '</div><div class="value">$' +
                  parseFloat(pricing.price).toFixed(2) +
                  '</div></label>',
              }).appendTo('.prices ul');
            });

            $('#price').val('');
            $('#price-text').text('');
            $('#quantity').val(0);
            $('.prices span').text('Please select product weight');
            $('.submit-order .bt-wrap').addClass('disabled');
            $('.quantity').addClass('disabled');

            $('.price-item input[type="radio"]').on('click', function() {
              $('.submit-order .bt-wrap').removeClass('disabled');
              $('#submit_order').removeClass('disabled');
              $('.quantity').removeClass('disabled');
              $('#quantity').val(1);

              var thisprice = $(this).data('price');
              var total = thisprice * 1;

              $('#price').val('$' + total);
              $('#price-text').text('$' + total);
            });

            $('.qbt').on('click', function() {
              var $button = $(this);
              var oldValue = $('#quantity').val();
              var thisweight = $(
                '.price-item input[type="radio"]:checked'
              ).data('weight');

              var maxqty = parseFloat(productData.quantity) / thisweight;
              var totalmax = parseInt(maxqty);
              var newVal;

              if ($button.val() == '+') {
                newVal =
                  oldValue < totalmax ? parseFloat(oldValue) + 1 : oldValue;
              } else {
                // Don't allow decrementing below zero
                newVal = oldValue > 1 ? parseFloat(oldValue) - 1 : 1;
              }

              var defprice = $('.price-item input[type="radio"]:checked').data(
                'price'
              ); //2
              var total = newVal * defprice;

              $('#quantity').val(newVal);
              $('#price').val('$' + total.toFixed(2));
              $('#price-text').text('$' + total.toFixed(2));
            });

            $('.submit-order').on('click', function() {
              if ($('.bt-wrap').hasClass('disabled')) {
                $('#select-variety').modal('show');
              }
            });
          } else {
            if (parseFloat(productData.quantity) > 0) {
              $('#submit_order').removeClass('disabled');
            }
            $('.qbt').on('click', function() {
              var $button = $(this);
              var oldValue = $('#quantity').val();
              var newVal;
              var total;

              if ($button.val() == '+') {
                newVal =
                  oldValue < parseFloat(productData.quantity)
                    ? parseFloat(oldValue) + 1
                    : oldValue;
              } else {
                // Don't allow decrementing below zero
                newVal = oldValue > 1 ? parseFloat(oldValue) - 1 : 1;
              }

              total = newVal * productData.pricing.price;
              $('#quantity').val(newVal);
              $('#price').val('$' + total.toFixed(2));
              $('#price-text').text('$' + total.toFixed(2));
            });
          }

          $('#type-uom').text(
            productData.quantityUOM === 'GR' ? 'Grams' : 'Qty'
          );

          $('#submit_order').click(function() {
            var typeuser = window.localStorage.getItem('LoggedIn');

            if (typeuser == 'in') {
              var start = 08 * 60 + 0;
              var end = 16 * 60 + 30;
              var date = new Date();
              var now = date.getHours() * 60 + date.getMinutes();
              var $checked = $('input[type="radio"]:checked');

              if (start <= now && now <= end) {
                var productToBeAddedToCart = {
                  productId: productData.id,
                  quantity: $('#quantity').val(),
                  weight: $checked.data('weight'),
                  weightID: $checked.val(),
                  weightUOM: $checked.data('uom'),
                  productName: productData.name + ($checked.data('name') || ''),
                  productPrice:
                    $checked.data('price') || productData.pricing.price,
                  locationId: location,
                };

                requestAddToCart(productToBeAddedToCart);
              } else {
                $('#order-out-time').modal('show');
              }
            } else {
              $('#unclock-feature').modal('show');
            }
          });

          requestBusiness(function(business) {
            var loggedUser = window.localStorage.getItem('LoggedIn') === 'in';
            var isTestUser =
              window.localStorage.getItem('UserEmail') === USER_TEST_EMAIL;

            if (business.allowCart === true && loggedUser && !isTestUser) {
              $('.order-section .quantity').removeClass('hide');
              $('.item-quantity').removeClass('hide');
            }
          });
        },
        error: function() {
          $('.shimmer-single-menu').hide();

          alert('Unable to obtain product, try again later.');
        },
      });

      $('#create-account').click(function() {
        controller.renderSignupView();
        $('.modal-backdrop').remove();
      });

      $('#order-out-time #close').click(function() {
        controller.renderHomeView();
        $('.modal-backdrop').remove();
      });
    });
  },

  renderSingleOrderView: function(order_id, location) {
    $('body').removeClass('account');
    $('body').addClass('app');
    $('.app-return button.logout').hide();

    $('.back-order').show();
    $('.back-menu').hide();
    $('.back-home').hide();

    $('.app-return').addClass('hidden-logout');

    var $tab = $('.page-wrap');
    $tab.empty();

    $('.page-wrap').load('./views/single-order.html', function() {
      $.ajax({
        url: API_BASE_URI + '/pos/orders/' + order_id + '/' + location,
        method: 'GET',
        error: function() {
          alert('Unable to obtain order, try again later.');
        },
        success: function(order) {
          var status = 'Completed';

          switch (order.status) {
            case 'open':
              status = 'New Order';
              break;

            case 'waiting_for_pickup':
              status = 'Waiting for Pick Up';
              break;

            case 'cancelled':
              status = 'Cancelled';
              break;

            default:
          }
          $('.order-number').html(
            '<span class="flabel">Order ID: </span>' + order.id
          );

          $('.order-status .main-status').html(
            '<span class="flabel">Order Status: </span>' + status
          );

          $('.order-location').html(
            '<span class="flabel">Location: </span>' + globalLocations[location]
          );

          $('.order-date').html(
            '<span class="flabel">Date: </span>' +
              moment(order.createdAt).format('MMM DD, YYYY')
          );

          $('.order-subtotal').html(
            '<span class="flabel">Subtotal: </span>$' + order.subTotal
          );

          $('.order-tax').html(
            '<span class="flabel">Tax: </span>$' + order.tax
          );

          $('.order-total').html(
            '<span class="flabel">Total: </span>$' + order.total
          );

          $('#complete-order').data('order', order.id);

          if (order.items.length === 0) {
            $('.order-products .notice').html(
              '<span class="flabel">No products found</span>'
            );
          } else {
            $('.order-products .notice').html(
              '<span class="flabel">Products: </span><div class="heading-list"><div class="order-quantity">Qty</div><div class="name">Product Name</div><div class="value">Price</div><div class="delete"></div></div>'
            );
          }

          order.items.forEach(function(item) {
            var html =
              '<div class="order-quantity">' +
              item.quantity +
              '</div><div class="name"> ' +
              item.description +
              '</div><div class="value">$' +
              item.price +
              '</div><div class="delete"></div>';

            $('<li/>', {
              class: 'product-item',
              id: '#product-' + item.productId,
              html: html,
            }).appendTo('.order-products ul');
          });
        },
      });
    });
  },

  renderCartView: function() {
    $('body').removeClass('account');
    $('body').addClass('app');
    $('.app-return button.logout').hide();

    $('.back-order').hide();
    $('.back-menu').show();
    $('.back-home').hide();

    $('.app-return').addClass('hidden-logout');

    var $tab = $('.page-wrap');
    $tab.empty();

    $('.page-wrap').load('./views/single-order.html', function() {
      $('.order-location').html(
        '<span class="flabel">Location: </span>' +
          globalLocations[cart.locationId]
      );

      $('.order-date').html(
        '<span class="flabel">Date: </span>' +
          moment(cart.createdAt).format('YYYY MMM DD - HH:mm')
      );

      function updateItems() {
        if (cart.items.length === 0) {
          $('.order-products .notice').html(
            '<span class="flabel">No products found</span>'
          );
        } else {
          $('.order-products .notice').html(
            '<span class="flabel">Products: </span><div class="heading-list"><div class="order-quantity">Qty</div><div class="name">Product Name</div><div class="value">Price</div><div class="delete"></div></div>'
          );
        }

        $('.order-products ul').empty();

        cart.items.forEach(function(item, index) {
          var html =
            '<div class="order-quantity">' +
            item.quantity +
            '</div><div class="name"> ' +
            item.productName +
            '</div><div class="value">$' +
            (item.productPrice ? item.productPrice.toFixed(2) : '') +
            '</div><div class="delete"><button data-location="' +
            selectedPosLocation +
            '" data-index="' +
            index +
            '">x</button></div>';

          $('<li/>', {
            class: 'product-item',
            id: '#product-' + item.productId,
            html: html,
          }).appendTo('.order-products ul');
        });

        var total = cart.items.reduce(function(t, item) {
          return t + item.productPrice * item.quantity;
        }, 0);

        $('.order-total').html(
          '<span class="flabel">Total: </span>$' + total.toFixed(2)
        );
      }

      updateItems();

      $('#complete-order').show();

      $('.product-item button').on('click', function() {
        var index = $(this).data('index');
        var location = $(this).data('location');
        $('#remove').data('index', index);
        $('#remove').data('location', location);
        $('#modal-order-remove').modal('show');
      });

      $('#remove').on('click', function() {
        $('#modal-order-remove').modal('hide');
        var index = $(this).data('index');
        var location = $(this).data('location');
        requestDeleteItemFromCart(index, location, function() {
          updateItems();
        });
      });

      /*COMPLETE ORDER*/
      $('#complete-order').on('click', function() {
        requestSubmitCart(selectedPosLocation);
      });

      /*CLOSE SCREEN AND REDIRECT AND REMOVE ORDER FORM CART*/
      $('#close').on('click', function() {
        $('.modal-backdrop').remove();
        controller.renderHomeView();
      });
    });
  },

  renderNotAllowedRegion: function() {
    $('body').removeClass('account');
    $('body').addClass('app');

    $('header.header').hide();
    $('footer.footer').hide();

    var $tab = $('.page-wrap');
    $tab.empty();
    $('.page-wrap').load('./views/not-region.html', function() {
      requestBusiness(function(business) {
        $('.page-wrap')
          .find('#skip-to-website')
          .on('click', function() {
            $(this).attr('href', business.externalWebsite);
          });
      });
    });
  },
};
