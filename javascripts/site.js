$(function() {
  $('.tag-list a.tag').live('click', function() {
    $(this).parents('h2').next('.posts').toggle();
  });
});
