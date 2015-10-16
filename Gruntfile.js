module.exports = function(grunt) {
  // Do grunt-related things in here

  grunt.loadNpmTasks('grunt-express-server');
  grunt.loadNpmTasks('grunt-contrib-watch');

  grunt.initConfig({
    express: {
      options: {
        // Override defaults here
      },
      dev: {
        options: {
          script: 'app.js'
        }
      }
    },

    watch : {
      express: {
        files: [
          '**/*.{js,json,jade}'
        ],
        tasks: ['express:dev'],
        options: {
          livereload: {
            port : 9001
          },
          nospawn: true //Without this option specified express won't be reloaded
        }
      }
    }

  });

  grunt.registerTask('serve', [ 'express:dev', 'watch' ])

};
