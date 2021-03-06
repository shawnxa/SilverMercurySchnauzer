import React, { Component } from 'react';
import TextField from '@material-ui/core/TextField';
import Button from '@material-ui/core/Button';
import Icon from '@material-ui/core/Icon';
import CloudUploadIcon from '@material-ui/icons/CloudUpload';
import axios from 'axios';


class WriteTweet extends Component {
  constructor(props) {
    super(props);
    this.state = {
      tweet: ''
    }
  }

  handleChange(e) {
    this.setState({ tweet: e.target.value });
    console.log(this.state.tweet);
    console.log(localStorage.getItem('userId'));

  }
  handleClick() {
    console.log('tweet to be sent', this.state.tweet);
    axios.post('/api/createPost/publish', { post: this.state.tweet, caption: '', url: '', userId: localStorage.getItem('userId') })
      .then((res) => {
        console.log(res);
        this.setState({
          tweet: ''
        });
      })
      .catch(console.log);

  }

  handleAnalyze() {
    console.log('clicked');
    axios.post('/api/getTweetTone', {tweet: this.state.tweet})
    .then((res) => {
      console.log(res);
    })
    .catch(console.log());
  }

  render() {
    return (
      <div className="write-tweet">
        <TextField
          id="standard-textarea"
          placeholder="Write your tweet here"
          className="input-field"
          maxLength={140}
          multiline
          fullWidth
          value={this.state.tweet}
          onChange={(e) => {
            this.handleChange(e);
          }}

        />
        <div className="button">
        <Button variant="contained" color="default" onClick={() => {
          this.handleAnalyze();
        }}>
        Analyze
        <CloudUploadIcon />
      </Button>
          <Button style={{"float" : "right"}} onClick={() => {
            this.handleClick();
          }} variant="contained" color="primary" >
            Send
        <Icon>send</Icon>
          </Button>
        </div>

      </div>
    );
  }
}

export default WriteTweet;