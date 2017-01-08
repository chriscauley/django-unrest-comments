uR.auth.ready(function() {
  riot.mount("comment-list");
});

<comment>
  <div class="comment_meta">
    <a href="javascript:;" onclick={ collapse } class="expand-link"></a>
    <span class="commented_by">{ username } - </span>
    <span class="commented_date">{ date_s }</span>
  </div>
  <div class="comment_content">{ comment }</div>
  <div class="comment_actions">
    <div if={ uR.auth.user}>
      <a onclick={ reply } title="reply" if={ uR.config.threaded_comments }><i class="fa fa-reply"></i> Post Reply</a>
      <!--| <a onclick="commentFlag({ pk });return false;" title="flag" href="#"><i class="fa fa-flag"></i> Flag</a>-->
      <a if={ user_pk == uR.auth.user.id } onclick={ edit } title="reply"
         href="#"><i class="fa fa-pencil"></i> Edit</a>
      <a if={ window._418 } href="/admin/mptt_comments/mpttcomment/{ pk }/delete/"><i class="fa fa-close"></i> Delete</a>
    </div>
    <div if={ !uR.auth.user && uR.config.threaded_comments }>
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
  <form action={ opts.form_url } method="POST" class="comment_form_wrapper" id={ opts.form_id }>
    <div class="comment_form">
      <md-help></md-help>
      <div class={ uR.config.form.field_class }>
      <textarea cols="40" class={ uR.theme.input } id="id_comment" name="comment"
                rows="10">{ opts.comment }</textarea>
      <input id="id_content_type" name="content_type" type="hidden" value={ opts.content_type } />
      <input id="id_object_pk" name="object_pk" type="hidden" value={ opts.object_pk } />
      <input id="id_parent_pk" name="parent_pk" type="hidden" value={ opts.parent_pk } />
      <input id="id_comment_pk" name="comment_pk" type="hidden" value={ opts.pk } />
      <div class="buttons">
        <input type="submit" class="submit-post { uR.config.btn_success }" value="Post" onclick={ submit } />
        <input type="submit" class="submit-post { uR.config.btn_cancel }" value="Cancel" onclick={ cancel } />
      </div>
      </fieldset>
    </div>
  </form>
  var self = this;
  self.parent = self.parent || self.opts.parent;
  cancel(e) {
    this.unmount();
  }
  this.on("mount",function() { this.update() });
  submit(e) {
    uR.ajax({
      url: this.opts.form_url,
      form: this.root.querySelector("form"),
      that: this,
      success: function callback(data) {
        if (self.parent.pk == data.pk) { // editing a comment
          var comments = self.parent.parent.comments;
          for (var i=0;i<comments.length;i++) {
            if (comments[i].pk == data.pk) {
              comments.splice(i,1,data);
              self.parent.parent.update();
              break;
            }
          }
        } else { // new comment
          self.parent.comments.splice(0,0,data);
          self.parent.update()
        }
        if (self.parent.pk) { self.unmount(); self.parent.update() }
        else {
          setTimeout(function() { window.location = '#c'+data.pk }, 200);
          self.id_comment.value = '';
        }
      }
    });
  }
</comment-form>

<comment-list>
  <h4>Comments</h4>
  <div class="alert alert-danger reply-warning" if={ comments.length && uR.config.threaded_comments }>
    If you want to respond to a comment, please click "Post Reply" underneath that comment.
    This way the comment author will receive a notification of your response.
  </div>
  <comment each={ comments }></comment>
  <div class="alert alert-warning" if={ !uR.auth.user }>
    <a href="/accounts/login/?next={ window.location.pathname }">Login to leave a comment</a>
  </div>
  <div if={ uR.auth.user }>
    <h5 class="section_title">Post a new comment</h5>
    <comment-form form_url="/comments/post/" object_pk={ opts.object_pk } content_type={ opts.content_type }
                  form_id="f0"/>
  </div>

  var self = this;
  this.on("mount",function() {
    uR.ajax({
      url: "/comments/list/",
      data: this.opts,
      that: this,
      success: function(data) {
        self.comments = data;
        self.form_url = "/comments/post/";
      },
    });
  });

</comment-list>

<md-help>
  <p>Comments are displayed using Markdown.</p>
  <a href="javascript:;" onclick={ toggle }>Show/hide Formatting help</a>
  <div class="markdown-table" style="overflow: hidden; max-height: 0">
    <table class="md-help" cellpadding="3">
      <tbody>
        <tr>
          <th><em>you type:</em></th>
          <th><em>you see:</em></th>
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
  </div>

  toggle(e) {
    this.visible = !this.visible;
    var table = this.root.querySelector(".markdown-table");
    table.style.maxHeight = this.visible?table.scrollHeight+"px":0;
  }
</md-help>

