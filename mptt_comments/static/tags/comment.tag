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
  var that = this;
  collapse(e) {
    $(e.target).closest('comment').toggleClass('collapsed');
  }
  openForm(form_opts) {
    form_opts.parent = that;
    var e = document.createElement("comment-form");
    var r = document.querySelector("#c"+that.pk+" >.comment_form")
    r.appendChild(e);
    riot.mount("comment-form",form_opts);
    e.querySelector("textarea").focus();
  }
  reply(e) {
    var form_opts = {
      parent_pk: that.pk,
      form_url: "/comments/post/",
      comment: '',
    }
    that.openForm(form_opts);
  }
  edit(e) {
    $.get(
      "/comments/"+that.pk+"/",
      function(form_opts) {
        form_opts.form_url = "/comments/edit/"+that.pk+"/",
        that.openForm(form_opts);
      },
      "json"
    )
  }
  that.root.className = "comment_level_{ level } l{ l_mod } comment_expanded";
  that.root.id = "c{ pk }";
</comment>

<comment-form>
  <form action={ opts.form_url } method="POST" class="comment_form_wrapper { loading: loading }" id={ opts.form_id }>
    <div class="comment_form">
      <md-help></md-help>
      <fieldset>
        <ul class="list-unstyled">
          <li class="required">
            <textarea cols="40" id="id_comment" name="comment" rows="10">{ opts.comment }</textarea>
            <input id="id_content_type" name="content_type" type="hidden" value={ opts.content_type } />
            <input id="id_object_pk" name="object_pk" type="hidden" value={ opts.object_pk } />
            <input id="id_parent_pk" name="parent_pk" type="hidden" value={ opts.parent_pk } />
            <input id="id_comment_pk" name="comment_pk" type="hidden" value={ opts.pk } />
          </li>
        </ul>
        <input type="submit" class="submit-post btn btn-primary" value="Post" onclick={ submit } />
        <input type="submit" class="submit-post btn btn-danger" value="Cancel" onclick={ cancel } />
      </fieldset>
    </div>
  </form>
  var that = this;
  that.parent = that.parent || that.opts.parent;
  this.loading = false;
  cancel(e) {
    this.unmount();
  }
  this.on("mount",function() { this.update() });
  submit(e) {
    this.loading = true;
    $.post(
      this.opts.form_url,
      $(this.root).find('form').serializeArray(),
      function callback(data) {
        if (that.parent.pk == data.pk) { // editing a comment
          var comments = that.parent.parent.comments;
          for (var i=0;i<comments.length;i++) {
            if (comments[i].pk == data.pk) {
              comments.splice(i,1,data);
              that.parent.parent.update();
              break;
            }
          }
        } else { // new comment
          that.parent.comments.splice(0,0,data);
          that.loading = false;
          that.parent.update()
        }
        if (that.parent.pk) { that.unmount(); that.parent.update() }
        else {
          that.loading = false;
          setTimeout(function() { window.location = '#c'+data.pk }, 200);
          that.id_comment.value = '';
        }
      },
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
  <div class="alert alert-warning" if={ !window._USER_NUMBER }>
    <a href="/accounts/login/?next={ window.location.pathname }">Login to leave a comment</a>
  </div>
  <div if={ window._USER_NUMBER }>
    <h2 class="section_title">Post a new comment</h2>
    <comment-form form_url="/comments/post/" object_pk={ object_pk } content_type={ content_type } form_id="f0"/>
  </div>

  this.comments = opts.comments;
  this.object_pk = opts.dataObject_pk;
  this.content_type = opts.dataContent_type;
</comment-list>

<md-help>
  <p>Comments are displayed using Markdown.</p>
  <a href="javascript:;" onclick="$(this).next().toggle()">Show Formatting help</a>
  <table class="md" cellpadding="3">
    <tbody>
      <tr style="background-color: #ffff99; text-align: center">
        <td><em>you type:</em></td>
        <td><em>you see:</em></td>
      </tr>
      <tr>
        <td>*italics*</td>
        <td><em>italics</em></td>
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

</md-help>

