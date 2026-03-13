package cmd

import (
	"context"
	"fmt"
	"io"
	"os"

	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/client"
	"github.com/spf13/cobra"
)

var (
	follow bool
	tail   string
)

var logsCmd = &cobra.Command{
	Use:   "logs [container]",
	Short: "Fetch container logs",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		cli, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
		if err != nil {
			return fmt.Errorf("failed to connect to Docker: %w", err)
		}
		defer cli.Close()

		out, err := cli.ContainerLogs(context.Background(), args[0], container.LogsOptions{
			ShowStdout: true,
			ShowStderr: true,
			Follow:     follow,
			Tail:       tail,
		})
		if err != nil {
			return fmt.Errorf("failed to get logs: %w", err)
		}
		defer out.Close()

		io.Copy(os.Stdout, out)
		return nil
	},
}

func init() {
	logsCmd.Flags().BoolVarP(&follow, "follow", "f", false, "Follow log output")
	logsCmd.Flags().StringVarP(&tail, "tail", "n", "all", "Number of lines to show from the end")
	rootCmd.AddCommand(logsCmd)
}
