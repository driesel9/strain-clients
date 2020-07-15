/*!
 * fastshell
 * Fiercely quick and opinionated front-ends
 * https://HosseinKarami.github.io/fastshell
 * @author Hossein Karami
 * @version 1.0.5
 * Copyright 2019. MIT licensed.
 */
(function ($, window, document, undefined) {

  'use strict';

  $(function () {


      $('.owl-carousel').owlCarousel({
            loop:true,
            margin:15,
            nav:false,
            responsive:{
                0:{
                    items:1.3
                },
                600:{
                    items:1.5
                },
                1000:{
                    items:2
                }
            }
      });


  });

})(jQuery, window, document);
