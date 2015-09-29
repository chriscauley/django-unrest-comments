<comment>
  <div class="comment_meta">
    <a href="javascript:;" onclick={ collapse } class="expand-link"></a>
    <span class="commented_by">{ username } - </span>
    <span class="commented_date">{ date_s }</span>
  </div>
  <div class="comment_content">{ comment }</div>
  <div class="comment_actions">
    <div if={ window._USER_NUMBER}>
      <a onclick={ reply } title="reply" href="#"><i class="fa fa-reply"></i> Post Reply</a>
      <!--| <a onclick="commentFlag({ pk });return false;" title="flag" href="#"><i class="fa fa-flag"></i> Flag</a>-->
      <a if={ user_pk == window._USER_NUMBER } onclick={ edit } title="reply"
         href="#"><i class="fa fa-pencil"></i> Edit</a>
      <a if={ window._418 } href="/admin/mptt_comments/mpttcomment/{ pk }/delete/"><i class="fa fa-close"></i> Delete</a>
    </div>
    <div if={ !window._USER_NUMBER }>
      <a href="/accounts/login/?next={ window.location.pathname }">Login to reply to this comment</a>
    </div>
  </div>
  <div class="comment_form"></div>
  <div class="comment_children">
    <comment each={ comments }></comment>
  </div>
  var that = this
  collapse(e) {
    $(e.target).closest('comment').toggleClass('collapsed');
  }
  function openForm(form_opts) {
    form_opts.parent_node = that
    $(that.root).find(">.comment_form").html("<comment-form id='f"+that.pk+"'></comment-form>");
    riot.mount("#f"+that.pk,form_opts)
  }
  reply(e) {
    var form_opts = {
      parent_pk: that.pk,
      form_url: "/comments/post/",
      comment: '',
    }
    openForm(form_opts);
  }
  edit(e) {
    $.get(
      "/comments/"+that.pk+"/",
      function(form_opts) {
        form_opts.form_url = "/comments/edit/"+that.pk+"/",
        openForm(form_opts);
      },
      "json"
    )
  }
  that.root.className = "comment_level_{ level } l{ l_mod } comment_expanded";
  that.root.id = "c{ pk }";
</comment>

<comment-form>
  <form action={ data.form_url } method="POST" class="comment_form_wrapper { loading && 'loading' }">
    <div class="comment_form">
      <p>Comments are displayed using Markdown.</p>
      <a href="javascript:;" onclick="$(this).next().toggleClass('show')">Show Formatting help</a>
      <table class="md" cellpadding="3">
        <tbody>
          <tr style="background-color: #ffff99; text-align: center">
            <td><em>you type:</em></td>
            <td><em>you see:</em></td>
          </tr>
          <tr>
            <td>*italics*</td><td><em>italics</em></td>
          </tr>
          <tr>
            <td>**bold**</td>
            <td><b>bold</b></td>
          </tr>
          <tr>
            <td>[txrx!](http://txrxlabs.org)</td>
            <td><a href="http://txrxlabs.org">txrx!</a></td>
          </tr>
          <tr>
            <td>http://txrxlabs.org</td>
            <td><a href="http://txrxlabs.org">http://txrxlabs.org</a></td>
          </tr>
          <tr>
            <td>* item 1<br>* item 2<br>* item 3</td>
            <td><ul><li>item 1</li><li>item 2</li><li>item 3</li></ul></td>
          </tr>
          <tr>
            <td>&gt; quoted text</td>
            <td><blockquote>quoted text</blockquote></td>
          </tr>
          <tr>
            <td>Lines starting with four spaces<br>are treated like code:<br><br><span class="spaces">&nbsp;&nbsp;&nbsp;&nbsp;</span>if 1 * 2 &lt; 3:<br><span class="spaces">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>print "hello, world!"<br></td>
            <td>Lines starting with four spaces<br>are treated like code:<br><pre>if 1 * 2 &lt; 3:<br>&nbsp;&nbsp;&nbsp;&nbsp;print "hello, world!"</pre></td>
          </tr>
        </tbody>
      </table>

      <fieldset>
        <ul class="list-unstyled">
          <li class="required">
            <textarea cols="40" id="id_comment" name="comment" rows="10">{ data.comment }</textarea>
            <input id="id_content_type" name="content_type" type="hidden" value={ data.content_type } />
            <input id="id_object_pk" name="object_pk" type="hidden" value={ data.object_pk } />
            <input id="id_parent_pk" name="parent_pk" type="hidden" value={ data.parent_pk } />
            <input id="id_comment_pk" name="comment_pk" type="hidden" value={ data.pk } />
          </li>
        </ul>
        <input type="submit" class="submit-post btn btn-primary" value="Post" onclick={ submit } />
        <input type="submit" class="submit-post btn btn-danger" value="Cancel" onclick={ cancel } />
      </fieldset>

    </div>
  </form>
  var that = this
  that.data = opts
  this.loading = false
  this.parent_node = opts.parent_node;
  cancel(e) {
    this.unmount()
  }
  submit(e) {
    this.loading = true
    function callback(data) {
      if (that.parent_node.pk == data.pk) { // editing a comment
        var comments = that.parent_node.comments;
        for (var i=0;i<comments.length;i++) {
          if (comments[i].pk == data.pk) {
            comments.splice(i,1,data)
            break
          }
        }
      } else { // new comment
        that.parent_node.comments.splice(0,0,data)
        that.loading = false
      }
      if (that.parent_node.pk) { that.unmount() }
      else {
        that.loading = false
        setTimeout(function(){window.location = '#c'+data.pk},200)
        that.id_comment.value = ''
      }
      riot.update()
    }
    $.post(
      this.data.form_url,
      $(this.root).find('form').serializeArray(),
      callback,
      "json"
    )
    return false;
  }
</comment-form>

<comment-list>
  <h2>Comments</h2>
  <div class="alert alert-danger reply-warning" if={ comments }>
    If you want to respond to a comment, please click "Post Reply" underneath that comment.
    This way the comment author will receive a notification of your response.
  </div>
  <comment each={ comments }></comment>
  <h2 class="section_title" if={ window._USER_NUMBER }>Post a new comment</h2>
  <div class="alert alert-warning" if={ !window._USER_NUMBER }>
    <a href="/accounts/login/?next={ window.location.pathname }">Login to leave a comment</a>
  </div>
  this.comments = opts.comments;
  this.on('mount', function() {
    if (!window._USER_NUMBER) { return }
    var form = document.createElement("comment-form");
    form.id = "f0";
    that = this;
    this.root.appendChild(form)
    riot.mount(form,'comment-form',{
      parent_node: that,
      form_url: "/comments/post/",
      object_pk: opts['data-object_pk'],
      content_type: opts['data-content_type']
    });
  })
</comment-list>
