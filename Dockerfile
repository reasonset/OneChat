FROM archlinux/base
RUN pacman -Sy
RUN pacman -S --noconfirm ruby

COPY . /var/OneChat
RUN sed -i -e "s/:BindAddress => '127.0.0.1'/:BindAddress => '0.0.0.0'/" /var/OneChat/test/chatwebrick.rb

CMD ["bash", "-c", "cd /var/OneChat/test; ./chatwebrick.rb"]
